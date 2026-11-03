# Dead-code report at 01f2acfe8

## Summary

- Scope: 48 workspace packages plus the root, commit 01f2acfe8, knip 5.88.1.
- Unused files: 859 (safe 96, needs check 586, false positive 177).
- Unused exports: 4119 (safe 1118, needs check 3001, false positive 0).
- Unused types: 3326 (safe 1175, needs check 2151, false positive 0).
- Unreachable modules (directories with no live file): 16 (safe 0, needs check 13, false positive 3).
- Needs check splits into 4096 package entry exports, 1339 test-only symbols or files, and 303 scripts, track files, and path references.
- apps/storytime, packages/architecture-enforcement, and packages/read-along (built by the Storytime track) have no safe row.
- Largest safe groups: apps/reading-advantage (452), packages/game-cartridges-3d (641), packages/game-cartridges (311).
- This report changes no source file. A count is a symbol or a file, not a line.

## Full table

Kind is file, export, type, or module. Location is file:line. Symbols lists the names for export and type rows.

### apps/accounting

Safe 17, needs check 5, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `apps/accounting/app/lib/__tests__/company-oidc-idp-double.ts:26` | `AUDIENCE`, `signIdToken`, `responseCookies` | safe | No module imports this export. |
| export | `apps/accounting/app/lib/company-oidc.ts:62` | `getAccountingPublicOrigin` | safe | No module imports this export. |
| type | `apps/accounting/app/_components/pending-submissions-list.tsx:21` | `PendingSubmissionsListProps` | safe | No module imports this type. |
| type | `apps/accounting/app/_components/submission-history-list.tsx:17` | `SubmissionHistoryListProps` | safe | No module imports this type. |
| type | `apps/accounting/app/lib/__tests__/company-oidc-idp-double.ts:68` | `TestIdentity` | safe | No module imports this type. |
| type | `apps/accounting/app/lib/company-oidc.ts:30` | `AccountingRole` | safe | No module imports this type. |
| type | `apps/accounting/app/lib/private-evidence-storage.ts:25` | `PutPrivateEvidenceInput`, `PutPrivateEvidenceResult`, `DeletePrivateEvidenceInput`, `ReadPrivateEvidenceInput` | safe | No module imports this type. |
| type | `apps/accounting/app/lib/route-helpers.ts:6` | `AccountingSessionUser`, `SameOriginCheck` | safe | No module imports this type. |
| type | `apps/accounting/app/lib/submissions.ts:163` | `ListAccountingSubmissionsRequest`, `ApproveAccountingSubmissionRequest`, `RejectAccountingSubmissionRequest` | safe | No module imports this type. |
| export | `apps/accounting/app/lib/company-oidc.ts:12` | `resolveAccountingCookieName` | needs check | Only tests use this symbol. |
| export | `apps/accounting/app/lib/submissions.ts:115` | `submitAccountingSubmission` | needs check | Only tests use this symbol. |
| type | `apps/accounting/app/lib/submissions.ts:93` | `SubmitAccountingSubmissionRequest` | needs check | Only tests use this symbol. |
| type | `apps/accounting/scripts/verify-accounting-release.ts:24` | `AccountingReleaseVerificationInput`, `AccountingReleaseVerificationResult` | needs check | Export in a manual script. |
| file | `apps/accounting/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/accounts

Safe 8, needs check 7, false positive 1, unreachable modules 1.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/accounts/lib/server/__fixtures__/` | | needs check | Every code file in this directory is unused. |
| export | `apps/accounts/lib/server/http.ts:45` | `currentSessionToken`, `requireCompanyAdmin`, `requireEmployee` | safe | No module imports this export. |
| type | `apps/accounts/app/accounts-console.tsx:45` | `ProvisioningHandoff` | safe | No module imports this type. |
| type | `apps/accounts/lib/server/telemetry.ts:16` | `AccountsTelemetrySeverity`, `AccountsTelemetryRecord`, `AccountsCapabilityTelemetryOptions`, `AccountsCapabilityTelemetry` | safe | No module imports this type. |
| file | `apps/accounts/lib/server/__fixtures__/company-identity-route-denominator/const-handler/route.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/accounts/lib/server/__fixtures__/company-identity-route-denominator/function-handler/route.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/accounts/lib/server/__fixtures__/company-identity-route-denominator/paired-swap-route.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| export | `apps/accounts/lib/server/company-identity-route-bindings.ts:8` | `companyIdentityRouteBindings` | needs check | Only tests use this symbol. |
| export | `apps/accounts/scripts/bootstrap-contract.ts:15` | `productionBootstrapSchema` | needs check | Export in a manual script. |
| export | `apps/accounts/scripts/dev-local-product-access.ts:60` | `main` | needs check | Export in a manual script. |
| type | `apps/accounts/scripts/bootstrap-contract.ts:29` | `ProductionBootstrapInput` | needs check | Export in a manual script. |
| file | `apps/accounts/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/activity-vinext-fixture

Safe 0, needs check 0, false positive 2, unreachable modules 1.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/activity-vinext-fixture/app/` | | false positive | Every code file in this directory is unused. |
| file | `apps/activity-vinext-fixture/app/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/activity-vinext-fixture/app/page.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |

### apps/advantage-games

Safe 285, needs check 191, false positive 14, unreachable modules 2.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/advantage-games/.agents/` | | false positive | Every code file in this directory is unused. |
| module | `apps/advantage-games/src/remotion/` | | needs check | Every code file in this directory is unused. |
| file | `apps/advantage-games/src/components/games/sentence/abyssal-well/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/games/sentence/realm-carver/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/archers-revenge/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/paladins-twin-soul/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/StartScreen.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/header.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/components/ui/alert.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/hooks/useCurrentLocale.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/advantage-games/src/hooks/useScopedI18n.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/advantage-games/src/components/multiplayer/LobbyScreen.tsx:296` | `default` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/multiplayer/MultiplayerGameWrapper.tsx:77` | `withMultiplayer` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/multiplayer/PodiumScreen.tsx:150` | `default` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/multiplayer/ScoreboardOverlay.tsx:121` | `default` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/ui/button.tsx:62` | `buttonVariants` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/ui/card.tsx:89` | `CardAction` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/ui/dialog.tsx:111` | `DialogPortal`, `DialogOverlay`, `DialogTrigger`, `DialogFooter`, `DialogDescription` | safe | No module imports this export. |
| export | `apps/advantage-games/src/components/ui/scroll-area.tsx:48` | `ScrollBar` | safe | No module imports this export. |
| export | `apps/advantage-games/src/hooks/useBackgroundMusic.ts:7` | `GAME_MUSIC_IDS` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/adaptive-difficulty/parameter-modifier.ts:24` | `getEngineForGame` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/api/rankingRoute.ts:8` | `DIFFICULTY_KEYS` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/castleDefense.ts:8` | `PLAYER_SPEED`, `ENEMY_SOLDIER_RADIUS`, `ENEMY_SOLDIER_HP`, `ENEMY_SOLDIER_SPEED`, `ENEMY_TANK_RADIUS`, `ENEMY_TANK_HP`, `ENEMY_TANK_SPEED`, `ENEMY_BOSS_RADIUS`, `ENEMY_BOSS_HP`, `ENEMY_BOSS_SPEED`, `TOWER_RANGE`, `TOWER_FIRE_RATE_MS`, `TOWER_DAMAGE`, `PROJECTILE_RADIUS`, `PROJECTILE_SPEED`, `BASE_RADIUS`, `MAX_ENEMIES`, `DEFAULT_PATH`, `moveEnemy`, `checkTowerActivation`, `updateTowers`, `updateProjectiles`, `checkBaseDamage`, `spawnWords` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/devourerSlime.ts:53` | `ORB_RADIUS`, `KNIGHT_RADIUS` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/difficulty.ts:52` | `DIFFICULTY_ORDER`, `validateDifficultyConfig` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/dungeonLiberator.ts:74` | `TRAIL_SPACING`, `TRAIL_SEGMENT_RADIUS`, `INVULNERABILITY_DURATION`, `BASE_MONSTER_SPEED` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/enchantedLibrary.ts:60` | `DIFFICULTY_CONFIG`, `PLAYER_RADIUS`, `SPIRIT_RADIUS`, `BOOK_RADIUS`, `SPIRIT_SPAWN_RATE_MS`, `INITIAL_SPIRIT_SPEED`, `PREDICT_AHEAD_DISTANCE`, `PLAYER_SPEED`, `MANA_GAIN_CORRECT`, `MANA_LOSS_INCORRECT`, `MANA_LOSS_SPIRIT_HIT`, `MIN_BOOK_SPAWN_DISTANCE`, `GAME_DURATION_MS` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/griffinRidersEscape.ts:86` | `spawnWave` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/hauntedLibrary.ts:51` | `FLOOR_HEIGHT`, `PLAYER_WIDTH`, `PLAYER_HEIGHT`, `DOOR_WIDTH`, `DOOR_HEIGHT`, `PLAYER_SPEED`, `GRAVITY`, `JUMP_FORCE`, `TRAMPOLINE_FORCE`, `GHOST_SPEED`, `BAT_SPEED`, `INITIAL_LIVES` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/spellweaversRun.ts:88` | `spawnOrb` | safe | No module imports this export. |
| export | `apps/advantage-games/src/lib/games/wizardZombie.ts:57` | `PLAYER_RADIUS`, `ZOMBIE_RADIUS`, `ORB_RADIUS`, `MAX_SHOCKWAVE_CHARGES`, `INVULNERABILITY_DURATION`, `DIFFICULTY_MODIFIERS` | safe | No module imports this export. |
| export | `apps/advantage-games/src/locales/client.ts:85` | `en` | safe | No module imports this export. |
| export | `apps/advantage-games/src/locales/GamesLocaleContext.tsx:21` | `DEFAULT_LOCALE` | safe | No module imports this export. |
| export | `apps/advantage-games/src/store/useGameStore.ts:14` | `DEFAULT_CASTLES` | safe | No module imports this export. |
| export | `apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts:15` | `ARCHERS_REVENGE_COMPLETION_RESPONSE`, `DRAGON_FLIGHT_COMPLETION_RESPONSE`, `DRAGON_RIDER_COMPLETION_RESPONSE`, `ENCHANTED_LIBRARY_COMPLETION_RESPONSE`, `MAGIC_DEFENSE_COMPLETION_RESPONSE`, `PALADINS_TWIN_SOUL_COMPLETION_RESPONSE`, `RPG_BATTLE_COMPLETION_RESPONSE`, `RUNE_MATCH_COMPLETION_RESPONSE` | safe | No module imports this export. |
| export | `apps/advantage-games/tests/e2e/helpers/gameHelpers.ts:63` | `mockArchersRevengeApis`, `expectArchersRevengeStartScreen`, `getArchersRevengeUrl`, `mockPaladinsTwinSoulApis`, `expectPaladinsTwinSoulStartScreen`, `getPaladinsTwinSoulUrl`, `mockGriffinSkyJoustApis`, `expectGriffinSkyJoustStartScreen`, `getGriffinSkyJoustUrl`, `mockGryphonPatrolApis`, `expectGryphonPatrolStartScreen`, `getGryphonPatrolUrl`, `mockRealmCarverApis`, `expectRealmCarverStartScreen`, `getRealmCarverUrl` | safe | No module imports this export. |
| export | `apps/advantage-games/tests/e2e/helpers/screenshotHelpers.ts:57` | `captureArchersRevengeScreenshot`, `capturePaladinsTwinSoulScreenshot`, `captureGriffinSkyJoustScreenshot`, `captureGryphonPatrolScreenshot`, `captureRealmCarverScreenshot` | safe | No module imports this export. |
| type | `apps/advantage-games/src/components/apk/AdvantageGamesAuthoringQc.tsx:129` | `AdvantageGamesAuthoringQcProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:47` | `ContentLocale`, `AuthenticatedCartridgeHostProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/apk/ExistingCoreCartridgeQc.tsx:59` | `ExistingCoreCartridgeQcProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx:45` | `PublicCartridgeHostProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/apk/StandardPackQc.tsx:44` | `StandardPackQcProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/apk/StandardPackSuitabilityQc.tsx:8` | `StandardPackSuitabilityQcProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/game/GameEndScreen.tsx:11` | `GameStat`, `GameEndScreenProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/abyssal-well/AbyssalWellGame.tsx:25` | `AbyssalWellGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx:44` | `DungeonLiberatorGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/GriffinSkyJoustGame.tsx:24` | `GriffinSkyJoustGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.tsx:15` | `SentenceItem`, `GryphonPatrolGameProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx:34` | `NavigateTarget` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/LabyrinthGoblinKingGame.tsx:25` | `LabyrinthGoblinKingGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx:21` | `PotionRushGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/rune-forge-chamber/RuneForgeChamberGame.tsx:23` | `RuneForgeChamberGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx:23` | `ShadowGateDungeonGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/spellweavers-run/SpellweaversRunGame.tsx:23` | `SpellweaversRunGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/storm-castle-tower/StormCastleTowerGame.tsx:26` | `StormCastleTowerGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/sentence/village-guardian/VillageGuardianGame.tsx:25` | `VillageGuardianGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/ui/VirtualDPad.tsx:13` | `VirtualDPadProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.tsx:21` | `AlchemistsSynthesisGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx:58` | `Difficulty`, `DragonRiderGameProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:48` | `EnchantedLibraryGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/ActionMenu.tsx:7` | `ActionPower`, `ActionMenuAction` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/Sprite.tsx:5` | `SpritePose` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx:50` | `RuneMatchGameResult`, `RuneMatchGameProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:48` | `WizardZombieGameResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/multiplayer/LobbyScreen.tsx:7` | `LobbyPlayer`, `LobbyScreenProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/multiplayer/MultiplayerGameWrapper.tsx:5` | `MultiplayerGameWrapperProps`, `MultiplayerGameContextValue` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/multiplayer/PodiumScreen.tsx:6` | `PodiumPlayer`, `PodiumScreenProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/multiplayer/ScoreboardOverlay.tsx:5` | `ScoreboardPlayer`, `ScoreboardOverlayProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/components/ui/VirtualDPad.tsx:13` | `VirtualDPadProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/hooks/useAdaptiveDifficulty.ts:12` | `AdaptiveDifficultyState`, `UseAdaptiveDifficultyReturn` | safe | No module imports this type. |
| type | `apps/advantage-games/src/hooks/useBackgroundMusic.ts:40` | `GameMusicId` | safe | No module imports this type. |
| type | `apps/advantage-games/src/hooks/useGameCamera.ts:4` | `Camera`, `ScreenPosition`, `UseGameCameraOptions`, `UseGameCameraResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/hooks/useMultiplayerGameState.ts:4` | `UseMultiplayerGameStateOptions`, `UseMultiplayerGameStateReturn` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/adaptive-difficulty/adjustment-engine.ts:3` | `AdjustmentConfig`, `AdjustmentResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/apk/completion-route.ts:28` | `ApkCompletionRequest` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/apk/content-route.ts:40` | `ApkContentRequest` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/apk/legacy-game-redirect.ts:5` | `LegacyGameRedirectParams` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/auth/contracts.ts:36` | `StudentLoginInput` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/gameCards.ts:3` | `GameCard` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games-runtime/index.ts:29` | `VirtualDPadProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games-runtime/VirtualDPad.tsx:12` | `VirtualDPadProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/abyssalWell.ts:42` | `AbyssalWellConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/abyssalWellConfig.ts:3` | `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/alchemistsSynthesis.ts:3` | `Point`, `AlchemistsSynthesisResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/api/rankingRoute.ts:9` | `DifficultyKey` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/api/types.ts:5` | `Difficulty`, `RankingEntry`, `RankingsByDifficulty`, `CompleteRequest`, `CompleteResponse`, `RankingResponse` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/archersRevenge.ts:66` | `ArchersRevengeConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/archersRevengeConfig.ts:3` | `ArchersRevengeConfig`, `ArchersRevengeDifficultySettings` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/castleDefense.ts:53` | `MapConfig`, `Entity`, `EnemyType`, `InputState`, `RoadInfo` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/contentPackSchema.ts:50` | `ContentPackValidationResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/devourerSlime.ts:3` | `Point`, `Velocity`, `Entity`, `SlimeConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/difficulty.ts:3` | `DifficultyTier` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/dungeonLiberator.ts:6` | `Point`, `DungeonLiberatorConfig`, `InputState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/dungeonLiberatorIndicators.ts:3` | `Indicator` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/enchantedLibrary.ts:3` | `Point`, `Entity`, `DifficultyConfig`, `EnchantedLibraryConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/griffinRidersEscapeConfig.ts:25` | `GriffinRiderDifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/griffinSkyJoust.ts:13` | `Entity`, `GriffinSkyJoustConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/gryphonPatrol.ts:3` | `Position`, `Velocity`, `Entity`, `XPParams` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/hauntedLibrary.ts:58` | `LibraryConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/labyrinthGoblinKing.ts:14` | `Position`, `Direction`, `TileType`, `LabyrinthGoblinKingConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/labyrinthGoblinKingConfig.ts:3` | `LabyrinthDifficulty`, `LabyrinthDifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/packRotation.ts:10` | `RotationRecord` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/potionRushEffects.ts:1` | `PortalFrame` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/realmCarver.ts:3` | `Point` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/rpgBattleWordSelection.ts:3` | `ActionPower`, `WordPerformance`, `BattleAction` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/runeForgeChamber.ts:8` | `Position`, `RuneForgeChamberConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/runeForgeChamberConfig.ts:5` | `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/runeMatch.ts:80` | `RuneMatchConfig`, `MatchGroup`, `MatchResult` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/runeMatchConfig.ts:3` | `Difficulty`, `MonsterConfig`, `RuneMatchConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/shadowGateDungeon.ts:8` | `Position`, `CreatureMode`, `ShadowGateDungeonConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/shadowGateDungeonConfig.ts:5` | `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/spellweaversRun.ts:40` | `SpellweaversRunConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/spellweaversRunConfig.ts:1` | `SpellweaversRunDifficulty`, `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/stormCastleTower.ts:6` | `Position`, `WindowState`, `HazardType`, `StormCastleTowerConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/stormCastleTowerConfig.ts:5` | `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/villageGuardian.ts:14` | `Position`, `VillageGuardianConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/villageGuardianConfig.ts:3` | `VillageGuardianDifficulty`, `DifficultyConfig` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/wizardZombie.ts:3` | `Point`, `WizardZombieConfig`, `InputState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/games/wizardZombieIndicators.ts:3` | `Indicator` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/multiplayer/game-session.ts:4` | `GameSessionStatus`, `GameSessionConfig`, `WordSubmission`, `PlayerGameState`, `RoundState`, `GameSessionState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/multiplayer/room-manager.ts:22` | `RoomManagerOptions` | safe | No module imports this type. |
| type | `apps/advantage-games/src/lib/multiplayer/scoring-engine.ts:1` | `ScoreConfig`, `WordScore`, `PlayerScore`, `RoundScore` | safe | No module imports this type. |
| type | `apps/advantage-games/src/locales/GamesLocaleContext.tsx:23` | `GamesLocaleContextValue`, `GamesLocaleProviderProps` | safe | No module imports this type. |
| type | `apps/advantage-games/src/store/useGameStore.ts:20` | `GameState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/store/usePotionRushStore.ts:11` | `GameState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/store/useRPGBattleStore.ts:4` | `BattleStatus`, `BattleTurn`, `BattlePose`, `BattleAttackPower`, `RPGBattleState` | safe | No module imports this type. |
| type | `apps/advantage-games/src/types/multiplayer.ts:25` | `VocabularyItem` | safe | No module imports this type. |
| type | `apps/advantage-games/tests/e2e/apk/authenticated-magic-defense-lifecycle.ts:7` | `AuthenticatedMagicDefenseLifecycleOptions` | safe | No module imports this type. |
| file | `apps/advantage-games/scripts/capture-catalog-load.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/advantage-games/scripts/capture-one.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/advantage-games/scripts/record-gameplay-video.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/advantage-games/scripts/rune-match-capture.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/advantage-games/src/__mocks__/next/server.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/advantage-games/src/components/games/game/Enemy.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/Explosion.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/GameContainer.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/GameEngine.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/HUD.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/InputController.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/MagicBolt.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/RankingDialog.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/ResultsScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/game/StartScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/r3f/SmokeScene.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/abyssal-well/AbyssalWellGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/castle-defense/BackgroundLayer.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/castle-defense/CastleDefenseGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/castle-defense/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/devourer-slime/DevourerSlimeGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/dungeon-liberator/DungeonLiberatorGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/dungeon-liberator/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/griffin-riders-escape/GriffinRidersEscapeGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/griffin-sky-joust/GriffinSkyJoustGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/gryphon-patrol/GryphonPatrolGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/labyrinth-goblin-king/LabyrinthGoblinKingGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/CauldronStation.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/ConveyorBelt.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/CustomerQueue.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushEffectsLayer.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/PotionRushSoundController.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/potion-rush/TrashPortal.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/realm-carver/RealmCarverGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/rune-forge-chamber/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/rune-forge-chamber/RuneForgeChamberGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/shadow-gate-dungeon/ShadowGateDungeonGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/spellweavers-run/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/spellweavers-run/SpellweaversRunGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/storm-castle-tower/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/storm-castle-tower/StormCastleTowerGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/sentence/village-guardian/index.ts:1` |  | needs check | A test reads this file by path in apps/advantage-games/tests/e2e/fixtures/gameFixtures.ts. |
| file | `apps/advantage-games/src/components/games/sentence/village-guardian/VillageGuardianGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/ui/VirtualDPad.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/alchemists-synthesis/AlchemistsSynthesisGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/archers-revenge/ArchersRevengeGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/dragon-flight/DragonFlightGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/dragon-flight/RankingDialog.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/BookPickupBurst.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/DifficultySelector.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/enchantedLibraryInput.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/RankingDisplay.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/SparkleBurst.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/enchanted-library/VocabularyProgress.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/paladins-twin-soul/PaladinsTwinSoulGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/ActionMenu.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/BattleEffects.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/BattleLog.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/BattleResults.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/BattleScene.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/BattleSelectionModal.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/ComboIndicator.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/EnemySprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/FloatingText.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/HealthBar.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/PlayerSprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rpg-battle/Sprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rune-match/MonsterSelection.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/rune-match/RuneMatchGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/multiplayer/LobbyScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/multiplayer/MultiplayerGameWrapper.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/multiplayer/PodiumScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/multiplayer/ScoreboardOverlay.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/avatar.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/dialog.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/DPad.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/input.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/scroll-area.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/tabs.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/components/ui/VirtualDPad.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useAccessibilitySettings.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useAdaptiveDifficulty.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useDirectionalInput.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useGameCamera.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useGameDimensions.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useGameFullscreen.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useGameLoop.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useInterval.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useMultiplayerGameState.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useMultiplayerSocket.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/usePerformanceMetrics.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useSession.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useSound.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/hooks/useSpriteAnimation.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/adaptive-difficulty/adjustment-engine.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/adaptive-difficulty/parameter-modifier.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/adaptive-difficulty/registerDifficultyParams.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/adaptive-difficulty/session-persistence.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/abyssalWell.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/abyssalWellConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/alchemistsSynthesis.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/archersRevenge.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/archersRevengeConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/basePath.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/castleDefense.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/contentPackSchema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/devourerSlime.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/difficulty.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/dragonFlight.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/dragonRider.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/dungeonLiberator.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/dungeonLiberatorIndicators.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/enchantedLibrary.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/griffinRidersEscape.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/griffinRidersEscapeConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/griffinSkyJoust.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/griffinSkyJoustConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/gryphonPatrol.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/gryphonPatrolConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/hauntedLibrary.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/labyrinthGoblinKing.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/labyrinthGoblinKingConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/magicDefenseConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/packRotation.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/paladinsTwinSoul.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/paladinsTwinSoulConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/potionRushEffects.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/realmCarver.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/realmCarverConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/rpgBattleScaling.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/rpgBattleSelection.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/rpgBattleSprites.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/rpgBattleWordSelection.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/rpgBattleXp.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/runeForgeChamber.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/runeForgeChamberConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/runeMatch.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/runeMatchConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/shadowGateDungeon.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/shadowGateDungeonConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/spellweaversRun.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/spellweaversRunConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/stormCastleTower.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/stormCastleTowerConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/villageGuardian.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/villageGuardianConfig.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/wizardZombie.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/wizardZombieIndicators.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/games/xp.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/multiplayer/game-session.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/multiplayer/room-manager.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/multiplayer/scoring-engine.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/multiplayer/ws-server.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/spriteAnimation.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/lib/xp.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/locales/client.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/locales/en.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/remotion/compositions/WizardZombieGameRenderer.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/advantage-games/src/remotion/compositions/WizardZombiePromo.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/advantage-games/src/remotion/index.ts:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/advantage-games/src/remotion/Root.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/advantage-games/src/remotion/test-index.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/advantage-games/src/store/usePotionRushStore.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/store/useRPGBattleStore.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/types/accessibility.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/types/adaptive-difficulty.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/src/types/multiplayer.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/advantage-games/tests/e2e/apk/seed-authenticated-student-content.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| export | `apps/advantage-games/src/components/apk/AuthenticatedCartridgeHost.tsx:50` | `authenticatedHostNavigation`, `buildAuthenticatedApkLoginHref` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/components/apk/PublicCartridgeHost.tsx:22` | `publicArcadeNavigation` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/components/ui/card.tsx:87` | `CardFooter` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/lib/apk/content-dependencies.ts:17` | `WIZARD_SPEECH_MANIFEST_ENV`, `getWizardSpeechLookup` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/lib/games-runtime/index.ts:28` | `VirtualDPad`, `calculateClientXP` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/lib/games-runtime/VirtualDPad.tsx:25` | `VirtualDPad` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/lib/games-runtime/xp.ts:27` | `calculateClientXP` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/locales/GamesLocaleContext.tsx:58` | `useGamesLocale`, `GamesLocaleContext` | needs check | Only tests use this symbol. |
| export | `apps/advantage-games/src/store/useGameStore.ts:13` | `MAX_CASTLE_HP`, `useGameStore` | needs check | Only tests use this symbol. |
| type | `apps/advantage-games/src/store/useGameStore.ts:9` | `Difficulty`, `CastleId` | needs check | Only tests use this symbol. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/src/App.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/src/components/Box.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/src/components/Sphere.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/src/Experience.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/src/main.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.agents/skills/react-three-fiber/assets/starter_r3f/vite.config.js:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/src/App.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/src/components/Box.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/src/components/Sphere.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/src/Experience.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/src/main.jsx:1` |  | false positive | Agent skill template asset, not app code. |
| file | `apps/advantage-games/.claude/skills/react-three-fiber/assets/starter_r3f/vite.config.js:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/advantage-games/jest.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/advantage-games/remotion.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/codecamp-advantage

Safe 15, needs check 10, false positive 1, unreachable modules 1.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/codecamp-advantage/lib/__tests__/prod-smoke/wave2-fixtures/` | | needs check | Every code file in this directory is unused. |
| export | `apps/codecamp-advantage/i18n/navigation.ts:4` | `redirect`, `getPathname` | safe | No module imports this export. |
| export | `apps/codecamp-advantage/lib/__tests__/prod-smoke/_helpers/live-smoke-guard.ts:53` | `liveSmokeSkip` | safe | No module imports this export. |
| type | `apps/codecamp-advantage/e2e/interactive-media-auth-gating.ts:18` | `InteractiveMediaAuthGate` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/__tests__/_helpers/cold-start-sampler.ts:14` | `ColdStartSample`, `ColdStartInput`, `ColdStartResult` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/auth-mode.ts:2` | `CodecampAuthMode` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/locale-resolution.ts:4` | `ResolvedRequestLocale` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/module-utils.ts:43` | `PrReviewStatus`, `PrReviewOperationalStatus`, `ModulePrReview` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/tutorial-capture-lease.ts:12` | `TutorialCaptureLease` | safe | No module imports this type. |
| type | `apps/codecamp-advantage/lib/tutorial-capture-limiter.ts:10` | `TutorialCaptureLimiterOptions`, `TutorialCaptureLimiter` | safe | No module imports this type. |
| file | `apps/codecamp-advantage/lib/__tests__/prod-smoke/wave2-fixtures/live-default.fixture.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/codecamp-advantage/lib/__tests__/prod-smoke/wave2-fixtures/opt-in-gated.fixture.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| export | `apps/codecamp-advantage/lib/company-oidc.ts:15` | `resolveCodecampCookieName` | needs check | Only tests use this symbol. |
| export | `apps/codecamp-advantage/lib/i18n-format.ts:1` | `formatRelativeTime`, `formatNumber` | needs check | Only tests use this symbol. |
| export | `apps/codecamp-advantage/lib/i18n-messages.ts:19` | `deepMerge` | needs check | Only tests use this symbol. |
| export | `apps/codecamp-advantage/lib/module-utils.ts:64` | `getModulePrStatus` | needs check | Only tests use this symbol. |
| type | `apps/codecamp-advantage/lib/i18n-messages.ts:6` | `NestedMessages` | needs check | Only tests use this symbol. |
| type | `apps/codecamp-advantage/lib/node-tutorial-repository-capture.ts:8` | `TutorialGitRunner` | needs check | Only tests use this symbol. |
| type | `apps/codecamp-advantage/lib/tutorial-repository-capture.ts:10` | `TutorialCapturePorts` | needs check | Only tests use this symbol. |
| file | `apps/codecamp-advantage/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/marketing

Safe 31, needs check 53, false positive 8, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `apps/marketing/app/__tests__/helpers/auth-mock.ts:74` | `authedInit` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/ai-credentials.ts:31` | `isMarketingAIProvider`, `resolveMarketingEnvironmentKey` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/ai.ts:1` | `getAIClient` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/company-oidc.ts:56` | `getMarketingPublicOrigin` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/db.ts:1` | `createPrivilegedDb` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/i18n.ts:268` | `defaultLocale` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/marketing-permissions.ts:38` | `MARKETING_ROLE_PERMISSIONS` | safe | No module imports this export. |
| export | `apps/marketing/app/lib/script-schema.ts:28` | `containsThaiNarration` | safe | No module imports this export. |
| type | `apps/marketing/app/__tests__/helpers/phase-7-i18n-contract.ts:7` | `Locale`, `Source`, `I18nAnalysis` | safe | No module imports this type. |
| type | `apps/marketing/app/campaigns/[id]/video/scene-editor.tsx:11` | `SceneEditorProps` | safe | No module imports this type. |
| type | `apps/marketing/app/campaigns/[id]/video/script-step.tsx:6` | `ScriptStepProps` | safe | No module imports this type. |
| type | `apps/marketing/app/campaigns/[id]/video/topic-step.tsx:15` | `TopicStepProps` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/ai-credentials.ts:8` | `MarketingAIProvider`, `MarketingAIEnvironment` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/ai.ts:2` | `AIClient`, `AIConfig` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/campaign-schema.ts:60` | `CreateCampaignBody`, `UpdateCampaignBody` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/db.ts:2` | `DB` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/marketing-permissions.ts:2` | `MarketingRole`, `MarketingRoutePermission` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/script-request-schema.ts:28` | `GenerateScriptBody` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/settings-schema.ts:26` | `SettingsPostBody`, `SettingsTestConnectionBody` | safe | No module imports this type. |
| type | `apps/marketing/app/lib/topic-schema.ts:25` | `SaveTopicsBody`, `ResearchTopicsBody`, `ResearchedTopicList` | safe | No module imports this type. |
| type | `apps/marketing/app/marketing-app-shell.tsx:9` | `MarketingAppShellProps` | safe | No module imports this type. |
| file | `apps/marketing/app/api/auth/callback/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/auth/company/start/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/auth/session/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/campaigns/[id]/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/campaigns/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/health/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/ready/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/settings/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/settings/test-connection/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/video/generate-script/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/video/projects/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/video/research-topics/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/api/video/save-topics/route.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/[id]/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/[id]/video/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/[id]/video/scene-editor.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/[id]/video/script-step.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/[id]/video/topic-step.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/campaigns/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/error.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/global-error.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/ai-credentials.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/ai.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/apps.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/auth.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/campaign-schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/campaign-status.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/company-oidc.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/db.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/encryption.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/i18n.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/login-redirect.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/marketing-permissions.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/public-url.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/redact.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/response.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/scene-editor.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/script-generation.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/script-request-schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/script-schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/settings-schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/settings-update.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/storage.ts:1` |  | needs check | A test reads this file by path in apps/marketing/app/__tests__/phase-1-boot.test.ts (+1). |
| file | `apps/marketing/app/lib/topic-dedup.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/topic-research.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/lib/topic-schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/login/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/marketing-app-shell.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/app/settings/page.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/marketing/proxy.ts:1` |  | needs check | Only tests import this file. |
| type | `apps/marketing/scripts/verify-marketing-release.ts:33` | `MarketingReleaseVerificationInput`, `MarketingReleaseVerificationResult` | needs check | Export in a manual script. |
| file | `apps/marketing/app/api/auth/logout/route.ts:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/campaigns/[id]/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/campaigns/[id]/video/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/campaigns/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/login/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/app/settings/layout.tsx:1` |  | false positive | vinext route file; knip has no vinext plugin. |
| file | `apps/marketing/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/primary-advantage

Safe 223, needs check 91, false positive 2, unreachable modules 2.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/primary-advantage/tests/pwa/` | | needs check | Every code file in this directory is unused. |
| module | `apps/primary-advantage/utils/` | | needs check | Every code file in this directory is unused. |
| file | `apps/primary-advantage/components/form-success.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/primary-advantage/components/ui/radio-group.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/primary-advantage/components/ui/rating.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/primary-advantage/lib/events.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/primary-advantage/utils/storage.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/primary-advantage/actions/practice.ts:34` | `getSentencesForOrderingGame` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:50` | `evidenceKeys` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/articles/questions/written-question-content.tsx:143` | `WRITTEN_QUESTION_CONFIGS` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/avatar/avatar-home.tsx:19` | `DRAWER_PAGE` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/avatar/avatar-shop.tsx:27` | `SHELF_SIZE`, `SHELVES_PER_PAGE` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/avatar/portrait-canvas.tsx:9` | `PACK_ROOT`, `composeWornPortrait` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/games/lesson-flashcard-game.tsx:166` | `LESSON_FLASHCARD_CONFIGS`, `LessonFlashcardGame` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/games/lesson-matching-game.tsx:91` | `SENTENCE_MATCHING_CONFIG`, `VOCABULARY_MATCHING_CONFIG` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:50` | `DECK_ORDER_PERFECT_TOAST`, `DECK_ORDER_RETRY_TOAST`, `DECK_ORDER_REVEAL_TOAST`, `ORDER_AUDIO_START_TOAST`, `ORDER_AUDIO_DONE_TOAST` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/task/index.ts:8` | `TaskVocabularyMatching` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/task/task-collection.tsx:246` | `default` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/lesson/task/task-vocabulary-matching.tsx:10` | `default` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/quest/boss-sprite.tsx:9` | `HIT_MS` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/rpg/toolbar.tsx:11` | `NAV_ART` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/storytime/storytime-book.tsx:18` | `STORYTIME_SPEEDS` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/teacher/class-login/qr-card-sheet.tsx:16` | `CARDS_PER_PAGE` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/teacher/class-login/use-class-login.ts:7` | `ROSTER_POLL_MS` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/teacher/guide-steps.tsx:12` | `PROJECTOR_GAME_STEPS` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/alert-dialog.tsx:205` | `AlertDialogPortal`, `AlertDialogOverlay` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/badge.tsx:60` | `badgeVariants` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/calendar.tsx:213` | `CalendarDayButton` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/card.tsx:89` | `CardAction` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/chart.tsx:369` | `ChartStyle` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/context-menu.tsx:241` | `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/copy-button.tsx:19` | `CopyButton` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/dialog.tsx:136` | `DialogOverlay`, `DialogPortal` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/dropdown-menu.tsx:243` | `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/form.tsx:160` | `useFormField` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/popover.tsx:48` | `PopoverAnchor` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/select.tsx:177` | `SelectGroup`, `SelectLabel`, `SelectScrollDownButton`, `SelectScrollUpButton`, `SelectSeparator` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/sheet.tsx:133` | `SheetClose`, `SheetFooter`, `SheetDescription` | safe | No module imports this export. |
| export | `apps/primary-advantage/components/ui/table.tsx:111` | `TableFooter`, `TableCaption` | safe | No module imports this export. |
| export | `apps/primary-advantage/data/prompts-ai.ts:61` | `saqeution_user`, `SENTENCE_SPLITTER_SYSTEM_PROMPT` | safe | No module imports this export. |
| export | `apps/primary-advantage/hooks/use-follow-scroll.ts:9` | `FOLLOW_ANCHOR` | safe | No module imports this export. |
| export | `apps/primary-advantage/hooks/use-install-prompt.ts:36` | `isStandaloneDisplay`, `isIosInstall` | safe | No module imports this export. |
| export | `apps/primary-advantage/hooks/use-layout.tsx:160` | `useLayout` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/ai/models.ts:54` | `resolveModelId` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/audio-highlight.ts:8` | `SEGMENT_STOP_TOLERANCE` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/authorization.ts:11` | `CONTENT_TOOLING_ROLES`, `XP_PER_FLASHCARD_GAME_POINT` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/cutover/temporary-passwords.ts:8` | `STAFF_ROLES` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/help/areas.ts:4` | `HELP_AREAS` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/lesson-progress.ts:2` | `TOTAL_LESSON_TASKS` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/permissions.ts:182` | `hasAllPermissions`, `canAccessRoute` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/read-along/align.ts:8` | `WordTimingSchema` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/read-along/position.ts:19` | `LEAD_IN_SECONDS` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/rpg/places.ts:89` | `heroArt` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/rpg/renderer.ts:5` | `RENDERER_SETTINGS_KEY`, `readFlatMode`, `saveFlatMode` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/session.ts:24` | `currentRole` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/sounds.ts:11` | `SOUND_MUTED_KEY_PREFIX` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/storytime/host.ts:4` | `STORYTIME_HOST` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/storytime/week.ts:48` | `storytimeWeekSchema` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/student-login/card-url.ts:5` | `CARD_SIGN_IN_PATH` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/student-login/http.ts:29` | `requestMeta`, `errorResponse`, `parseBody` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/translation-language.ts:4` | `TRANSLATION_LANGUAGE_CODES` | safe | No module imports this export. |
| export | `apps/primary-advantage/lib/zod.ts:108` | `articleResponseSchema` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/controllers/articleController.ts:66` | `fetchAllFlashcards`, `deleteFlashcardByIdAction` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/controllers/questController.ts:27` | `teacherQuestCard`, `studentQuestCard`, `questTemplates` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/controllers/voiceController.ts:20` | `voiceConfig` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/models/teacherModel.ts:288` | `outranksTeacher` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/utils/auth.ts:303` | `canAccessSchool` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/utils/flashcard-game-submit.ts:8` | `flashcardGameBodySchema` | safe | No module imports this export. |
| export | `apps/primary-advantage/server/utils/import-school.ts:7` | `importSchoolFieldSchema` | safe | No module imports this export. |
| type | `apps/primary-advantage/actions/avatar.ts:10` | `AvatarActionState` | safe | No module imports this type. |
| type | `apps/primary-advantage/actions/lesson-attempts.ts:10` | `RestartLessonActionState` | safe | No module imports this type. |
| type | `apps/primary-advantage/actions/lesson-games.ts:20` | `LessonGameInputResult`, `LessonGameResultsResult` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:749` | `MCQContentMode` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/articles/questions/written-question-content.tsx:61` | `WrittenQuestionInput`, `WrittenQuestionModal`, `WrittenFinishInput`, `WrittenQuestionConfig`, `WrittenQuestionKind` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/dashboard/user-activity-chart-data.ts:6` | `CumulativeXpChartPoint` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/games/game-host.tsx:39` | `GameHostProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/index/contact-links.tsx:7` | `ContactLabels` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-flashcard-game.tsx:77` | `LessonFlashcard`, `LessonFlashcardLabels`, `LessonFlashcardConfig`, `LessonFlashcardKind` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-game-picker.tsx:15` | `LessonGamePickerProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-matching-game.tsx:73` | `MatchingVariantConfig` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-sentence-cloze-test.tsx:428` | `SentenceClozeGameSource` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:107` | `OrderWordGameSource`, `OrderWordLabels` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/games/lesson-sentence-order.tsx:47` | `OrderSentenceGameSource`, `OrderGameLabels` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/lesson-card.tsx:20` | `LessonCardSource` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:73` | `LessonProgressSource`, `LessonProgressBarProps`, `StandaloneLessonProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/lesson-step-rail.tsx:10` | `LessonStepRailProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/lesson/task/task-collection.tsx:14` | `CollectionTaskKind` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/nav/app-nav.tsx:20` | `AppNavProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/read-along/read-along-passage.tsx:21` | `ReadAlongPassageProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/read-along/read-along-player.tsx:27` | `ReadAlongPlayerProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/reedy/reedy-session.tsx:15` | `ReedyPhase`, `ReedyErrorKey` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/rpg/chrome.tsx:124` | `RpgTone` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/school/school-form.tsx:68` | `SchoolFormMode` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/shared/route-error.tsx:12` | `RouteErrorProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/stories/chapter-list.tsx:7` | `ChapterListItem` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/stories/read-tabs.tsx:6` | `ReadTab` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/story-games/StoryGamesClient.tsx:16` | `GameCard` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/storytime/storytime-book.tsx:23` | `StorytimeBookProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/student-login/errors.tsx:35` | `StudentErrorMessageProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/student-login/picture-grid.tsx:12` | `PictureGridProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/student-login/pictures.tsx:63` | `PictureIconProps`, `PictureSequenceProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/student/history-list.tsx:16` | `HistoryListVariant` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-challenges-notice.tsx:4` | `ClassChallengesNoticeProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/class-login-panel.tsx:17` | `ClassLoginPanelProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/class-session-control.tsx:13` | `ClassSessionControlProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/class-sheet.tsx:21` | `ClassSheetProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/picture-password-setting.tsx:9` | `PicturePasswordSettingProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/qr-card-sheet.tsx:19` | `QrCardSheetProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/qr-card.tsx:7` | `QrCardProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/qr-code.tsx:10` | `QrCodeProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/class-login/rotate-card-confirm.tsx:7` | `RotateCardConfirmProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/print-lesson-frame.tsx:14` | `PrintLessonFrameLabels` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/projector-game-panel.tsx:14` | `ProjectorGamePanelProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/teacher/teacher-shell.tsx:13` | `TeacherPageHeaderProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/ui/calendar-heatmap.tsx:24` | `Classname`, `WeightedDateEntry`, `CalendarProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/components/ui/data-table.tsx:30` | `DataTablePaginationApi`, `DataTableFilterApi`, `DataTableProps` | safe | No module imports this type. |
| type | `apps/primary-advantage/hooks/use-install-prompt.ts:9` | `InstallPromptState`, `BeforeInstallPromptEvent` | safe | No module imports this type. |
| type | `apps/primary-advantage/hooks/use-read-along.ts:11` | `ReadAlongState` | safe | No module imports this type. |
| type | `apps/primary-advantage/hooks/useAudioSegment.ts:8` | `AudioSegmentState` | safe | No module imports this type. |
| type | `apps/primary-advantage/host-proof-test-config.ts:8` | `HostProofTestCredentials` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/ai/models.ts:6` | `PrimaryAiTask`, `PrimaryAiTaskSetting` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/audio-highlight.ts:16` | `AudioSegment`, `SentenceSegment`, `OrderingFields` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/cutover/temporary-passwords.ts:11` | `HandoutRow`, `StaffAccount` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/fsrs-service.ts:18` | `CardState` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/games/completion.ts:13` | `RunContext`, `HostCompletion` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/help/areas.ts:6` | `HelpArea` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/observability/logger.ts:8` | `LogPayload` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/read-along/profile.ts:7` | `ProfileSentence`, `ProfileTag`, `Profile` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/rpg/places.ts:103` | `BossClip` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/rpg/renderer.ts:6` | `RendererInputs` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/storytime/blend.ts:21` | `BlendPart` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/storytime/week.ts:68` | `StorytimeWeekPackage` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/teacher-manual-guide.ts:110` | `ManualSection` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/translation-language.ts:9` | `TranslationLanguageCode` | safe | No module imports this type. |
| type | `apps/primary-advantage/lib/zod.ts:201` | `UpdateClassroomBody`, `UpdateOwnDisplayNameBody` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/models/schoolModel.ts:24` | `LeaderboardResult`, `SchoolLeaderboardData` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/assignment-access.ts:6` | `AssignmentCaller` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/assistant.ts:18` | `FeedbackSource` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/auth.ts:97` | `CallerScope` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/flashcard-game-submit.ts:48` | `DeckGameResult` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/import-school.ts:10` | `ImportCaller` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/middleware.ts:8` | `AuthenticatedUser`, `AuthenticatedApiHandler` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/passwordEvents.ts:10` | `PasswordActor` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/role-sql.ts:7` | `RoleExecutor` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/school-access.ts:4` | `SchoolActor` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/utils/school-admin-rows.ts:7` | `SchoolAdminRow` | safe | No module imports this type. |
| type | `apps/primary-advantage/server/xp/award-question-xp.ts:21` | `AwardQuestionXpInput` | safe | No module imports this type. |
| type | `apps/primary-advantage/types/enum.ts:9` | `ArticleType`, `ArticleBaseCefrLevel`, `ArticleCefrLevel`, `ActivityStatus` | safe | No module imports this type. |
| file | `apps/primary-advantage/actions/classroom.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/actions/signinAction.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/actions/signupAction.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/components/teacher/class-code-generator.tsx:1` |  | needs check | A test reads this file by path in apps/primary-advantage/components/__tests__/loading-state-flow.behavior.test.tsx. |
| file | `apps/primary-advantage/hooks/use-current-role.ts:1` |  | needs check | A test reads this file by path in apps/primary-advantage/components/teacher/__tests__/my-students.test.tsx. |
| file | `apps/primary-advantage/host-proof-test-config.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/lib/cutover/temporary-passwords.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/lib/primary-evidence-backfill.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/lib/read-along/profile.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/scripts/help/stage-help-videos.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/primary-advantage/scripts/issue-temporary-passwords.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/primary-advantage/scripts/profile-read-along.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/primary-advantage/scripts/seed-host-proof-session.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/primary-advantage/scripts/storytime/receive-weeks.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/primary-advantage/server/utils/middleware.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/primary-advantage/tests/pwa/fixture-server.mjs:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/primary-advantage/tests/pwa/fixtures/legacy-sw.js:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/primary-advantage/tests/pwa/takeover.spec.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/primary-advantage/utils/resend.ts:1` |  | needs check | String path reference in apps/primary-advantage/app/api/send/route.ts. |
| export | `apps/primary-advantage/actions/flashcard.ts:348` | `getUserFlashcardDecks` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/articles/questions/mc-question-content.tsx:785` | `default` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/articles/questions/written-question-content.tsx:681` | `default` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/avatar/avatar-shop.tsx:37` | `tryOnPieces` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/avatar/portrait-canvas.tsx:36` | `composePortrait` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/book-link/book-landing.tsx:18` | `BookLandingView` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/book-link/book-link-case.tsx:60` | `BookLinkCaseView` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/lesson/games/lesson-matching-game.tsx:859` | `LessonMatchingGame` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/quest/assign-quest-form.tsx:20` | `defaultBattleAt` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/quest/battle-client.tsx:46` | `tallyRun` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/read-along/read-along-player.tsx:13` | `READ_ALONG_SPEEDS`, `nextSpeed` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/reedy/reedy-session.tsx:36` | `reedyStateForEvent` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/reedy/reedy.tsx:12` | `REEDY_POSES` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/story-games/StoryGamesClient.tsx:13` | `practiceLocaleOf`, `gameCardsFor` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/student-login/use-student-home.ts:10` | `STUDENT_HOME` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/student/student-view-provider.tsx:23` | `useStudentView` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/components/teacher/guide-script.tsx:23` | `scriptWithoutPictures` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/hooks/use-install-prompt.ts:6` | `INSTALL_DISMISS_KEY` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/i18n/public-fallback.ts:2` | `PUBLIC_NAMESPACES` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/ai/models.ts:30` | `PRIMARY_AI_TASKS`, `resetPrimaryAiClients` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/audio-highlight.ts:47` | `resolveSegmentEnd` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/auth-strength.ts:7` | `FULL_AUTH_ONLY_ROUTES`, `requiresFullAuth` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/authorization.ts:8` | `USER_MANAGEMENT_ROLES`, `XP_AWARD_BY_ACTIVITY`, `XP_PER_CORRECT_MC_ANSWER`, `XP_SA_MAX`, `XP_LA_MAX`, `isPlainBasename` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/games/catalog.ts:12` | `LEGACY_GAME_IDS` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/help/areas.ts:24` | `helpArea` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/help/match.ts:10` | `routeScore` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/permissions.ts:132` | `hasPermission`, `getEffectiveRole` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/pwa/constants.ts:14` | `CACHE_PREFIX`, `CACHE_VERSION`, `OFFLINE_CACHE_NAME`, `OFFLINE_FILES` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/read-along/align.ts:98` | `tokenizeWords` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/read-along/position.ts:51` | `seekTimeForSentence` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/route-policies.ts:8` | `POLICY_ROLES` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/rpg/renderer.ts:5` | `chooseRenderer` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/safe-callback-path.ts:38` | `bookCallbackPath` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/sounds.ts:20` | `soundMutedKey` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/storage-config.ts:6` | `STORAGE_CONFIG`, `getArticleImageKey`, `getStoryImageKey`, `getChapterImageKey` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/story-games/completion.ts:9` | `storyGameType` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/storytime/week.ts:135` | `publishedWeek` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/student-view.ts:40` | `PREVIEW_READ_ONLY`, `PreviewWriteError`, `assertStudentWriter` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/utils.ts:5` | `LEVELS_XP` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/lib/zod.ts:16` | `signUpSchema` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/server/controllers/assignmentController.ts:45` | `toAssignmentStudent` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/server/models/classroomModel.ts:99` | `createClassCode`, `getLastActivityByStudent` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/server/models/userModel.ts:28` | `createUser`, `getUserByEmail` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/server/utils/assistant.ts:26` | `readFeedbackSource` | needs check | Only tests use this symbol. |
| export | `apps/primary-advantage/server/utils/auth.ts:271` | `getUserSchoolIds` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/components/reedy/reedy-session.tsx:21` | `ReedyBrowser` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/components/teacher/enrollment-classroom.ts:17` | `ClassroomPayload` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/lib/permissions.ts:5` | `Permission` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/lib/storage-config.ts:26` | `ArticlePictureSource`, `StoryPictureSource` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/server/utils/auth.ts:15` | `UserWithRoles` | needs check | Only tests use this symbol. |
| type | `apps/primary-advantage/server/xp/award-question-xp.ts:18` | `QuestionXpTx` | needs check | Only tests use this symbol. |
| file | `apps/primary-advantage/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/primary-advantage/public/serwist/sw.js:1` |  | false positive | Static file served from public/, not imported. |

### apps/reading-advantage

Safe 452, needs check 98, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `apps/reading-advantage/app/[locale]/(student)/student/stories/[storyId]/stories-custom-error.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/dashboard/classroom-goals/classroom-goal-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/dashboard/classroom-goals/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/dashboard/classroom-xp-chart.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/dashboard/user-recent-activity.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/flash-card-practice-button.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/flash-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/flip-card-button.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/games/sentence/castle-defense/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/StartScreen.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rune-match/StartScreen.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/games/vocabulary/wizard-vs-zombie/StartScreen.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/index/benefit-box.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/index/book.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-collapsible-notice.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-introduction.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-sentence-preview.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-sentense-flash-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-summary.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-vocabulary-activity-choice.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-vocabulary-collection.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card-button.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-vocabulary-flash-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/lesson/lesson-vocabulary-preview.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/practic/quote-item.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/practic/quote-list.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/practic/reorder.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/active-users.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/activity-distribution-pieChart.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/articles-per-level.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/articles-type-genre.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/license-usage.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/LowestLatedArticlesTable.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/system/top-schools-xp-gained.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/teacher/edit-student.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/teacher/remove-student-inclass.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/tour/CustomCard.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/ui/carousel.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/ui/collapsible.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/ui/date-field.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/components/ui/slider.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/hooks/use-metrics-stream.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/hooks/useLowestRatedArticles.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/cache/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/classroom-utils.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/flashcard-client.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/migrate-user-levels.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/password-utils.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/steps.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/student-dashboard-data.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/lib/use-trpc-auth.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/controllers/velocity-controller.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/services/metrics/cache-service.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/utils/generators/key-generator.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/utils/route-adapter.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/utils/validators/article-validator.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/server/utils/verify-user-expired.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/styles/themes.css:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/reading-advantage/types/lesson-story.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/reading-advantage/actions/flashcard.ts:95` | `getDashboardData`, `reviewCard`, `saveFlashcard` | safe | No module imports this export. |
| export | `apps/reading-advantage/actions/pratice.ts:91` | `getFlashcardDeckId` | safe | No module imports this export. |
| export | `apps/reading-advantage/app/[locale]/(system)/system/license/columns.tsx:98` | `getColumns` | safe | No module imports this export. |
| export | `apps/reading-advantage/client/services/firestore-client-services.ts:6` | `userService` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/dashboard/ai-teacher-brief.tsx:43` | `AITeacherBrief` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/dashboard/index.ts:3` | `TeacherOverviewKPIs`, `ClassSummaryTable`, `AITeacherBrief`, `ClassDetailDashboard`, `ClassDashboardKPIs`, `ClassAssignmentFunnel`, `ClassAlignmentMatrix`, `ClassVelocityTable`, `ClassActivityHeatmap`, `ClassGenreEngagement`, `ClassAccuracyMetrics`, `ClassBatchActions` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/dashboard/telemetry-tracker.tsx:121` | `useTelemetry`, `useActivityHeatmapTelemetry`, `useTimelineTelemetry` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/dashboard/widget-shell.tsx:204` | `WidgetLoadingState`, `WidgetErrorState`, `WidgetEmptyState` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/flashcards/deck-view.tsx:120` | `SingleDeckViewInline` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/flashcards/index.ts:2` | `DeckView`, `FlashcardGameInline`, `EmptyDashboard` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/games/ui/button.tsx:62` | `buttonVariants` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/games/ui/card.tsx:89` | `CardAction` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/license-usage-list.tsx:66` | `columns` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/pie-chart.tsx:19` | `description` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/alert-dialog.tsx:131` | `AlertDialogPortal`, `AlertDialogOverlay` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/badge.tsx:40` | `badgeVariants` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/chart.tsx:368` | `ChartStyle` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/context-menu.tsx:193` | `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, `ContextMenuGroup`, `ContextMenuPortal`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuRadioGroup` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/dialog.tsx:111` | `DialogPortal`, `DialogOverlay` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/drawer.tsx:109` | `DrawerPortal`, `DrawerOverlay`, `DrawerClose`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/dropdown-menu.tsx:195` | `DropdownMenuRadioItem`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/form.tsx:168` | `useFormField` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/scroll-area.tsx:48` | `ScrollBar` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/select.tsx:162` | `SelectScrollUpButton`, `SelectScrollDownButton` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/table.tsx:112` | `TableFooter`, `TableCaption` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/toast.tsx:126` | `ToastAction` | safe | No module imports this export. |
| export | `apps/reading-advantage/components/ui/use-toast.ts:76` | `reducer` | safe | No module imports this export. |
| export | `apps/reading-advantage/data/prompt-level-test-chat.ts:131` | `default` | safe | No module imports this export. |
| export | `apps/reading-advantage/hooks/use-audio.ts:27` | `isCombinedAudioClip` | safe | No module imports this export. |
| export | `apps/reading-advantage/i18n/routing.ts:3` | `useLocale`, `redirect` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/cache/fallback-queries.ts:28` | `queryWithFallback`, `getStudentVelocity`, `getAssignmentFunnel`, `getDailyActivityRollups` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/cache/metrics.ts:350` | `getMetricsCacheMetrics`, `metricsCache` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/cache/query-optimizer.ts:15` | `executeBatchQuery`, `debounceQuery`, `checkConnectionHealth` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/db-optimization-init.ts:60` | `shutdownDbOptimization` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/enums.ts:59` | `TeacherRole`, `QuizStatus`, `AnswerStatus` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/games/castleDefense.ts:8` | `PLAYER_SPEED`, `ENEMY_SOLDIER_RADIUS`, `ENEMY_SOLDIER_HP`, `ENEMY_SOLDIER_SPEED`, `ENEMY_TANK_RADIUS`, `ENEMY_TANK_HP`, `ENEMY_TANK_SPEED`, `ENEMY_BOSS_RADIUS`, `ENEMY_BOSS_HP`, `ENEMY_BOSS_SPEED`, `TOWER_RANGE`, `TOWER_FIRE_RATE_MS`, `TOWER_DAMAGE`, `PROJECTILE_RADIUS`, `PROJECTILE_SPEED`, `BASE_RADIUS`, `MAX_ENEMIES`, `DEFAULT_PATH`, `moveEnemy`, `checkTowerActivation`, `updateTowers`, `updateProjectiles`, `checkBaseDamage`, `spawnWords` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/games/enchantedLibrary.ts:60` | `DIFFICULTY_CONFIG`, `PLAYER_RADIUS`, `SPIRIT_RADIUS`, `BOOK_RADIUS`, `SPIRIT_SPAWN_RATE_MS`, `INITIAL_SPIRIT_SPEED`, `PREDICT_AHEAD_DISTANCE`, `PLAYER_SPEED`, `MANA_GAIN_CORRECT`, `MANA_LOSS_INCORRECT`, `MANA_LOSS_SPIRIT_HIT`, `MIN_BOOK_SPAWN_DISTANCE`, `GAME_DURATION_MS` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/games/magicDefenseConfig.ts:47` | `DIFFICULTY_SETTINGS` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/games/runeMatch.ts:309` | `applyGravity` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/games/wizardZombie.ts:57` | `PLAYER_RADIUS`, `ZOMBIE_RADIUS`, `ORB_RADIUS`, `MAX_SHOCKWAVE_CHARGES`, `INVULNERABILITY_DURATION`, `DIFFICULTY_MODIFIERS` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/gcs-url.ts:11` | `getGcsAudioUrl` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/pagination/smart-paginator.ts:355` | `paginateQuery`, `paginateWithCursor` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/telemetry/dashboard-telemetry.ts:304` | `dashboardTelemetry` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/utils.ts:95` | `camelToSentenceCase` | safe | No module imports this export. |
| export | `apps/reading-advantage/lib/validations/index.ts:97` | `parsePath` | safe | No module imports this export. |
| export | `apps/reading-advantage/locales/navigation.ts:2` | `Link`, `redirect`, `useLocale` | safe | No module imports this export. |
| export | `apps/reading-advantage/locales/server.ts:3` | `getI18n`, `getCurrentLocale` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/activity-controller.ts:1113` | `getActiveUsers`, `createUserActivity`, `getUserActivities`, `deleteUserActivity`, `updateUserActivity` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/article-controller.ts:540` | `updateArticlesByTypeGenre` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/enhanced-alignment-controller.ts:46` | `getEnhancedAlignmentMetrics` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/level-test-controller.ts:47` | `validateAssessment` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/license-controller.ts:269` | `deactivateLicense`, `updateUserLicense`, `getFilteredLicenses`, `calculateXpForLast30Days` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/metrics-controller.ts:21` | `getAlignmentMetrics` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/metrics-extended-controller.ts:21` | `getGenreMetrics`, `getSRSMetrics` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/question-controller.ts:1226` | `rateArticle` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/stories-assistant-controller.ts:35` | `getFeedbackWritter`, `chatBot` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/stories-controller.ts:25` | `checkChapterCompletion` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/controllers/user-controller.ts:967` | `getUserHeatmap`, `deleteAllUsers`, `getLessonXp`, `calculateXpForLast30Days`, `getXp30days` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/middleware/guards.ts:327` | `combineGuards` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/models/license.ts:24` | `createLicenseModel` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/demo-activity-generator.ts:55` | `generateStudentProfile`, `generateStudentDailyActivities`, `generateMultiDayActivities` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/demo-isolation-service.ts:24` | `verifyDemoLicense`, `verifyDemoSchool`, `checkDemoUsersBelongToDemoLicense`, `checkDemoClassesHaveOnlyDemoUsers`, `checkCrossLicenseData`, `checkDemoActivitiesIsolation` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/localization/genre-localization-service.ts:50` | `getLocalizedGenreName`, `getLocalizedRecommendationType`, `getLocalizedMetricLabel`, `getLocalizedTimeframe`, `getLocalizedScope`, `getLocalizedInsight`, `localizeGenreRecommendation`, `localizeGenreList`, `clearLocaleCache` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/metrics/assignment-prediction-service.ts:324` | `refreshAssignmentFunnelMetrics` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/metrics/genre-engagement-service.ts:101` | `isCefrAppropriate`, `getStudentGenreEngagement`, `getClassGenreEngagement`, `getSchoolGenreEngagement`, `generateStudentGenreRecommendations`, `refreshGenreEngagementMetrics` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/metrics/srs-health-service.ts:164` | `DEFAULT_OVERLOAD_THRESHOLDS` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/metrics/velocity-service.ts:342` | `getClassVelocity`, `getSchoolVelocity`, `getBulkStudentVelocity`, `getSystemVelocity`, `refreshVelocityMatviews` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/services/srs-quick-actions-service.ts:82` | `createReviewSession`, `sendPracticeReminders`, `reduceCardLoad`, `createTeacherAlert` | safe | No module imports this export. |
| export | `apps/reading-advantage/server/utils/authorization.ts:219` | `verifyClassroomSchool`, `verifyStudentSchool`, `getAccessibleClassroomIds`, `authorizationError` | safe | No module imports this export. |
| export | `apps/reading-advantage/store/useGameStore.ts:12` | `DEFAULT_CASTLES` | safe | No module imports this export. |
| export | `apps/reading-advantage/utils/google.ts:29` | `googleFlashThinking` | safe | No module imports this export. |
| export | `apps/reading-advantage/utils/openai.ts:12` | `openaiImages` | safe | No module imports this export. |
| export | `apps/reading-advantage/utils/workbook-data-mapper.ts:45` | `mapArticleToWorkbookJSON` | safe | No module imports this export. |
| type | `apps/reading-advantage/components/apk/StudentCartridgeHost.tsx:41` | `StudentCartridgeHostProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/apk/StudentGamesCatalog.tsx:46` | `StudentGamesCatalogProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/classroom-student-table.tsx:19` | `ClassroomStudent` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/ai-teacher-brief.tsx:25` | `AIInsight`, `AITeacherBriefProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/class-detail-dashboard.tsx:38` | `ClassDetailDashboardProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/class-summary-table.tsx:60` | `ClassSummaryTableProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/index.ts:19` | `TeacherDashboardContentProps`, `TeacherOverviewKPIsProps`, `ClassSummaryTableProps`, `ClassSummaryData`, `AITeacherBriefProps`, `AIInsight`, `ClassDetailDashboardProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/kpi-card.tsx:23` | `KPICardProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/teacher-dashboard-content.tsx:13` | `TeacherDashboardContentProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/teacher-overview-kpis.tsx:15` | `TeacherOverviewKPIsProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/dashboard/widget-shell.tsx:25` | `WidgetShellProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/flashcards/flashcard-dashboard.tsx:11` | `Deck` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/flashcards/flashcard-game.tsx:47` | `Rating` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/game/GameEndScreen.tsx:8` | `GameStat`, `GameEndScreenProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/game/GameStartScreen.tsx:22` | `GameStartScreenProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/sentence/potion-rush/PotionRushGame.tsx:28` | `PotionRushGameResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx:55` | `Difficulty`, `DragonRiderGameProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:45` | `EnchantedLibraryGameResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.tsx:7` | `ActionPower`, `ActionMenuAction` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/rpg-battle/Sprite.tsx:5` | `SpritePose` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/rune-match/RuneMatchGame.tsx:44` | `RuneMatchGameResult`, `RuneMatchGameProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/games/vocabulary/wizard-vs-zombie/WizardZombieGame.tsx:49` | `WizardZombieGameResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/icons.tsx:58` | `Icon` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/lesson/practics/lesson-saq.tsx:45` | `QuestionResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/models/questions-model.ts:2` | `QuestionsRecord`, `MCQRecord`, `SARecord`, `LARecord`, `QuizStatus`, `Questions` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/practic/types.ts:20` | `Article`, `Id`, `Quote`, `Dragging`, `QuoteMap`, `Task`, `WrapperProps`, `InnerListProps`, `QuoteListProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/rating-popup.tsx:23` | `RatingTarget` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/teacher/teacher-data-table.tsx:29` | `TeacherDataTableProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/badge.tsx:26` | `BadgeProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/button.tsx:37` | `ButtonProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/calendar-heatmap.tsx:20` | `Classname`, `WeightedDateEntry`, `CalendarProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/calendar.tsx:11` | `CalendarProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/input.tsx:5` | `InputProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/ui/textarea.tsx:5` | `TextareaProps` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/user-role-management.tsx:67` | `Payment` | safe | No module imports this type. |
| type | `apps/reading-advantage/components/word-list.tsx:27` | `WordListDataSource` | safe | No module imports this type. |
| type | `apps/reading-advantage/configs/locale-config.ts:10` | `LocaleConfig` | safe | No module imports this type. |
| type | `apps/reading-advantage/hooks/use-audio-segment.ts:4` | `UseAudioSegmentResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/hooks/use-audio.ts:12` | `UseAudioOptions` | safe | No module imports this type. |
| type | `apps/reading-advantage/host-proof-test-config.ts:8` | `HostProofTestCredentials` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/apk/legacy-game-redirect.ts:5` | `LegacyGameRedirectParams` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/cache/fallback-queries.ts:18` | `FallbackOptions` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/cache/metrics.ts:12` | `MetricsUpdatePayload`, `CacheEntry`, `CacheOptions`, `CacheMetrics` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/env.ts:59` | `Env` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/castleDefense.ts:53` | `MapConfig`, `Entity`, `EnemyType`, `InputState`, `RoadInfo` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/enchantedLibrary.ts:3` | `Point`, `Entity`, `DifficultyConfig`, `EnchantedLibraryConfig` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/gameCards.ts:3` | `GameCard` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/potionRushEffects.ts:1` | `PortalFrame` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/rpgBattleWordSelection.ts:3` | `ActionPower`, `WordPerformance`, `BattleAction` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/runeMatch.ts:80` | `RuneMatchConfig`, `MatchGroup`, `MatchResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/runeMatchConfig.ts:3` | `MonsterConfig`, `RuneMatchConfig` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/wizardZombie.ts:3` | `Point`, `WizardZombieConfig` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/games/wizardZombieIndicators.ts:3` | `Indicator` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/telemetry/dashboard-telemetry.ts:9` | `TelemetryEvent`, `HeatmapInteraction`, `TimelineInteraction`, `DashboardNavigation` | safe | No module imports this type. |
| type | `apps/reading-advantage/lib/translate-sentence.ts:8` | `TranslateSentenceResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/article-controller.ts:656` | `LanguageType` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/assignment-funnel-controller.ts:29` | `AssignmentFunnelMetrics`, `AssignmentFunnelResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/generator-controller.ts:70` | `GeneratedMCQuestion` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/lesson-controller.ts:14` | `Context` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/level-test-controller.ts:26` | `LevelTestChatRequest`, `LevelTestAssessment`, `LevelTestPlacementRequest`, `LevelTestPlacement` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/license-controller.ts:17` | `Context` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/srs-health-controller.ts:34` | `SRSHealthResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/stories-question-controller.ts:71` | `LARecord` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/teacher-assignment-controller.ts:7` | `TeacherAssignment` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/controllers/translation-controller.ts:18` | `LanguageType`, `TranslateResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/middleware/guards.ts:21` | `GuardContext` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/models/article.ts:24` | `ArticleTimepoint`, `Article`, `ArticleQuestion`, `ArticleLAQuestion`, `ArticleMCQuestion`, `ArticleSAQuestion` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/article-service.ts:12` | `FormattedArticle`, `ArticleForReaderResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/demo-activity-generator.ts:13` | `StudentProfile` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/demo-isolation-service.ts:15` | `IsolationCheckResult` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/metrics/student-dashboard-service.ts:43` | `StudentDashboardMetrics`, `StudentDashboardGoal` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/metrics/velocity-service.ts:57` | `ClassVelocityMetrics`, `SchoolVelocityMetrics`, `SystemVelocityMetrics` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/services/srs-quick-actions-service.ts:40` | `QuickActionResponse`, `ReviewSessionConfig`, `ReminderConfig`, `LoadReductionConfig` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/authorization.ts:20` | `UserContext` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/article-generator.ts:9` | `GenerateArticleParams` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/audio-words-generator.ts:24` | `GenerateAudioParams`, `GenerateChapterAudioParams` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts:11` | `EvaluateRatingParams`, `EvaluateRatingResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/question-generator.ts:21` | `GenerateQuestionResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/random-select-genre.ts:4` | `RandomSelectGenreParams`, `randomSelectGenreResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/stories-topic-generator.ts:13` | `GenerateStoriesTopicResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/topic-generator.ts:14` | `GenerateTopicResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/translation-generator.ts:17` | `TranslatedSummaryResponse`, `TranslatedPassageResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/server/utils/generators/word-list-generator.ts:11` | `GenerateWordListResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/store/classroom-store.ts:34` | `Classes` | safe | No module imports this type. |
| type | `apps/reading-advantage/store/useGameStore.ts:20` | `GameState` | safe | No module imports this type. |
| type | `apps/reading-advantage/store/usePotionRushStore.ts:6` | `GameState` | safe | No module imports this type. |
| type | `apps/reading-advantage/store/useRPGBattleStore.ts:4` | `BattleStatus`, `BattleTurn`, `BattlePose`, `BattleAttackPower`, `RPGBattleState` | safe | No module imports this type. |
| type | `apps/reading-advantage/types/classroom-teacher.ts:1` | `ClassroomTeacher`, `ClassroomWithTeachers`, `AddCoTeacherRequest`, `RemoveCoTeacherRequest` | safe | No module imports this type. |
| type | `apps/reading-advantage/types/constants.ts:23` | `UserRole` | safe | No module imports this type. |
| type | `apps/reading-advantage/types/dashboard.ts:10` | `TimeRange`, `PaginationParams`, `PaginatedResponse`, `ApiError`, `ClassStudent`, `ClassStudentsResponse`, `AssignmentFunnelMetrics`, `ClassAssignmentFunnelMetrics`, `SchoolAssignmentFunnelMetrics`, `AtRiskStudent`, `AssignmentFunnelResponse`, `CSVExportOptions`, `ExportableResponse` | safe | No module imports this type. |
| type | `apps/reading-advantage/types/learning-goals.ts:3` | `LearningGoal`, `GoalMilestone`, `GoalProgressLog` | safe | No module imports this type. |
| file | `apps/reading-advantage/actions/pratice.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/dashboard/enhanced-activity-heatmap.tsx:1` |  | needs check | A test reads this file by path in apps/reading-advantage/__test__/implementation-validation.test.ts. |
| file | `apps/reading-advantage/components/games/game/GameEndScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/game/GameStartScreen.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/castle-defense/BackgroundLayer.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/castle-defense/CastleDefenseGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/CauldronStation.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/ConveyorBelt.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/CustomerQueue.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/PotionRushEffectsLayer.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/PotionRushGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/PotionRushSoundController.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/sentence/potion-rush/TrashPortal.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/ui/button.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/ui/card.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/ui/input.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/dragon-rider/DragonRiderGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/BookPickupBurst.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/DifficultySelector.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/EnchantedLibraryGame.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/enchantedLibraryInput.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/RankingDisplay.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/SparkleBurst.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/enchanted-library/VocabularyProgress.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/ActionMenu.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleEffects.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleLog.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleResults.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleScene.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/BattleSelectionModal.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/ComboIndicator.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/EnemySprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/FloatingText.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/HealthBar.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/PlayerSprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/games/vocabulary/rpg-battle/Sprite.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/components/system/system-sidebar-nav.tsx:1` |  | needs check | A test reads this file by path in apps/reading-advantage/__test__/structural-ux-a11y.test.tsx. |
| file | `apps/reading-advantage/components/teacher/sidebar-teacher-nav.tsx:1` |  | needs check | A test reads this file by path in apps/reading-advantage/__test__/structural-ux-a11y.test.tsx. |
| file | `apps/reading-advantage/hooks/useGameLoop.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/host-proof-test-config.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/i18n.ts:1` |  | needs check | Framework convention file; confirm the framework does not load it. |
| file | `apps/reading-advantage/lib/cache/query-optimizer.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/castleDefense.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/dragonRider.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/enchantedLibrary.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/gameCards.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/potionRushEffects.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/rpgBattleScaling.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/rpgBattleSprites.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/rpgBattleWordSelection.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/rpgBattleXp.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/sampleVocabulary.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/utils.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/lib/games/vocabLoader.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/scripts/check-alignment-data.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/check-archived.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/check-classroom-teachers.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/clear-cache.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/refresh-materialized-views.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/refresh-velocity-matviews.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/security-audit.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/seed-host-proof-session.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/scripts/seed/create-test-session.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/reading-advantage/server/services/demo-activity-generator.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/server/services/refresh-matviews-service.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/store/usePotionRushStore.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/reading-advantage/store/useRPGBattleStore.ts:1` |  | needs check | Only tests import this file. |
| export | `apps/reading-advantage/lib/games/dragonFlight.ts:101` | `selectGate` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/lib/games/rpgBattleSelection.ts:39` | `battleLocations`, `battleEnemies` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/lib/games/runeMatch.ts:143` | `initializeEmptyGrid`, `calculateMatchDamage` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/lib/games/wizardZombie.ts:60` | `INITIAL_HP` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/server/controllers/generator-controller.ts:86` | `transformMCQuestion` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/server/controllers/user-controller.ts:128` | `parseActivityType`, `xpForActivityType` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/server/middleware/guards.ts:29` | `requireAuth`, `requireSchoolAccess`, `requireClassroomAccess`, `requireStudentSelf`, `requireSchoolMatch` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/server/services/demo-isolation-service.ts:296` | `runAllIsolationChecks` | needs check | Only tests use this symbol. |
| export | `apps/reading-advantage/server/utils/authorization.ts:35` | `canAccessSchool`, `canAccessClassroom`, `canAccessStudent`, `isOwnData`, `buildClassroomFilter`, `buildStudentFilter` | needs check | Only tests use this symbol. |
| type | `apps/reading-advantage/hooks/use-audio.ts:4` | `Sentence` | needs check | Only tests use this symbol. |
| type | `apps/reading-advantage/hooks/useDirectionalInput.ts:3` | `InputVector` | needs check | Only tests use this symbol. |
| type | `apps/reading-advantage/lib/games/rpgBattleSelection.ts:3` | `BattleHeroId`, `BattleLocationId`, `BattleEnemyId`, `BattleHeroOption`, `BattleLocationOption`, `BattleEnemyOption` | needs check | Only tests use this symbol. |
| type | `apps/reading-advantage/lib/games/runeMatch.ts:9` | `VocabularyRune`, `PowerUpRune` | needs check | Only tests use this symbol. |
| file | `apps/reading-advantage/jest.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/sales-advantage

Safe 8, needs check 10, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `apps/sales-advantage/i18n/navigation.ts:4` | `redirect`, `getPathname` | safe | No module imports this export. |
| export | `apps/sales-advantage/lib/company-oidc.ts:133` | `getSalesPublicOrigin` | safe | No module imports this export. |
| export | `apps/sales-advantage/lib/rate-limit.ts:33` | `checkRateLimit` | safe | No module imports this export. |
| type | `apps/sales-advantage/components/lesson-content.tsx:5` | `LessonContentProps` | safe | No module imports this type. |
| type | `apps/sales-advantage/lib/auth-mode.ts:2` | `SalesAuthMode` | safe | No module imports this type. |
| type | `apps/sales-advantage/lib/company-oidc.ts:30` | `SalesRequestAuthenticationResult` | safe | No module imports this type. |
| type | `apps/sales-advantage/lib/locale-resolution.ts:4` | `ResolvedRequestLocale` | safe | No module imports this type. |
| file | `apps/sales-advantage/scripts/release-source-manifest.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/sales-advantage/scripts/verify-sales-continuation.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/sales-advantage/scripts/verify-sales-release-inputs.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| export | `apps/sales-advantage/lib/company-oidc.ts:43` | `resolveSalesCookieName`, `salesSessionUser` | needs check | Only tests use this symbol. |
| export | `apps/sales-advantage/scripts/static-seed.ts:3112` | `verifyStaticSalesCurriculum` | needs check | Export in a manual script. |
| type | `apps/sales-advantage/scripts/verify-legacy-rollback.ts:74` | `LegacyRollbackVerificationInput`, `LegacyRollbackVerificationResult` | needs check | Export in a manual script. |
| type | `apps/sales-advantage/scripts/verify-sales-release.ts:24` | `SalesReleaseVerificationInput`, `SalesReleaseVerificationResult` | needs check | Export in a manual script. |
| file | `apps/sales-advantage/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/science-advantage

Safe 134, needs check 54, false positive 5, unreachable modules 1.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/` | | needs check | Every code file in this directory is unused. |
| file | `apps/science-advantage/components/features/student/student-progress-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/science-advantage/contexts/language-context.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/science-advantage/hooks/use-mobile.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/science-advantage/lib/auth/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/science-advantage/components/client-logger.ts:18` | `debug` | safe | No module imports this export. |
| export | `apps/science-advantage/components/features/lesson/index.ts:5` | `BlockErrorBoundary`, `TextBlock`, `VocabularyBlock`, `ImageBlock`, `ReadingPassageBlock`, `ProcedureBlock`, `MaterialsBlock`, `ImageGallery` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/alert-dialog.tsx:147` | `AlertDialogPortal`, `AlertDialogOverlay`, `AlertDialogTrigger` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/alert.tsx:59` | `AlertTitle` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/badge.tsx:54` | `badgeVariants` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/card.tsx:87` | `CardFooter`, `CardAction` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/dropdown-menu.tsx:243` | `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/form.tsx:159` | `useFormField` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/select.tsx:122` | `SelectGroup`, `SelectLabel`, `SelectSeparator` | safe | No module imports this export. |
| export | `apps/science-advantage/components/ui/table.tsx:112` | `TableFooter`, `TableCaption` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/ai/image-generator.ts:86` | `ImageGenerator`, `generateLessonDiagram` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/ai/recommendation-service.ts:191` | `recommendationSchema` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/auth/server.ts:30` | `requireApiAuth`, `requireApiRole` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/auth/session.ts:14` | `SESSION_COOKIE_NAME`, `setSessionCookie`, `getSessionToken`, `deleteSessionCookie` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/config/recommendations.ts:20` | `resetTestkit` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/content-parsers.ts:182` | `getSection`, `extractMaterials`, `extractProcedure` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/enums.ts:13` | `STANDARDS_ALIGNMENT_VALUES`, `MASTERY_RUN_STATUS_VALUES` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/observability/sentry.ts:82` | `captureMessage` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/platform/redis-client.ts:100` | `resetRedisClient` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/schemas/lesson-content.schema.ts:93` | `MaterialItemSchema`, `ReviewQuestionItemSchema`, `QuizOptionSchema`, `ZodError` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/schemas/seed-validation.ts:7` | `SeedQuizQuestionSchema`, `SeedQuizQuestionsFileSchema`, `SeedLessonSchema`, `SeedLessonsFileSchema` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/schemas/validate-json.ts:205` | `validateQuizQuestionsFile` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/services/index.ts:10` | `recordStandardMastery`, `clampMasteryLevel` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/utils/generateJoinCode.ts:81` | `isValidJoinCodeFormat` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/validations/class.ts:19` | `STANDARDS_ALIGNMENT_VALUES`, `isValidJoinCodeFormat` | safe | No module imports this export. |
| export | `apps/science-advantage/lib/validations/params.ts:47` | `lessonIdParamSchema` | safe | No module imports this export. |
| type | `apps/science-advantage/components/features/lesson/image-gallery.tsx:17` | `ImageGalleryLayout`, `ImageGalleryProps` | safe | No module imports this type. |
| type | `apps/science-advantage/components/features/lesson/index.ts:6` | `LessonPlayerProps`, `ImageGalleryProps`, `ImageGalleryLayout` | safe | No module imports this type. |
| type | `apps/science-advantage/components/features/lesson/lesson-player.tsx:198` | `LessonPlayerProps` | safe | No module imports this type. |
| type | `apps/science-advantage/components/features/lesson/vocabulary-flashcards.tsx:13` | `VocabularyFlashcardsProps` | safe | No module imports this type. |
| type | `apps/science-advantage/components/features/student/ai-recommendation-card.tsx:40` | `RecommendationFetcher`, `PollOptions` | safe | No module imports this type. |
| type | `apps/science-advantage/components/features/teacher/class-detail/join-code-panel.tsx:74` | `JoinCodePanelProps` | safe | No module imports this type. |
| type | `apps/science-advantage/components/ui/skeleton.tsx:7` | `SkeletonProps` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/ai/image-generator.ts:6` | `DiagramRequest` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/ai/mastery-calculator.ts:19` | `MasteryUpdate`, `MasteryCalculationResult` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/auth/constants.ts:2` | `UserRole` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/config/ai-images.ts:12` | `AiImageConfig` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/config/ai.ts:13` | `AiConfig` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/enums.ts:16` | `StandardsAlignmentType`, `MasteryRunStatus` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/forms/from-zod.ts:17` | `SchemaFieldOverride`, `SchemaFieldConfig` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/grade4-normalization.ts:38` | `NormalizedQuestion`, `NormalizationResult` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/interventions/cache.ts:61` | `InterventionCacheValue` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/interventions/config.ts:57` | `InterventionConfig`, `SeverityThreshold` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/observability/__tests__/fixtures/make-request-context.ts:26` | `MakeRequestContextOptions` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/observability/context.ts:3` | `RequestContext` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/observability/logger.ts:77` | `LogPayload` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/observability/metrics.ts:34` | `MetricTags` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/observability/sentry.ts:20` | `CaptureContext` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/platform/cache-adapter.ts:1` | `RedisLike`, `CacheAdapterOptions` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/platform/redis-client.ts:3` | `RedisClient` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/schemas/lesson-content.schema.ts:267` | `MaterialItem`, `ReviewQuestionItem`, `QuizOption` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/schemas/seed-validation.ts:69` | `SeedQuizQuestion`, `SeedQuizQuestionsFile`, `SeedLesson`, `SeedLessonsFile` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/schemas/validate-json.ts:8` | `StandardData`, `StandardsFile`, `LessonData`, `LessonsFile`, `CurriculumUnitData`, `CurriculumUnitsFile`, `QuizQuestionData`, `QuizQuestionsFile` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/services/classes/get-class-detail.ts:37` | `ClassDetailWithCurriculum` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/services/classes/get-student-classes.ts:15` | `StudentEnrolledClassSummary` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/services/index.ts:2` | `StudentEnrolledClassSummary`, `ClassDetailWithCurriculum`, `MasteryRunContext`, `MasteryRunResult`, `StandardMasteryRow`, `StandardMasteryWriteInput` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/services/mastery/mastery-worker.ts:21` | `MasteryRunContext`, `MasteryRunResult` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/services/mastery/standard-mastery.ts:5` | `StandardMasteryWriteInput`, `StandardMasteryRow` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/validations/assignments.ts:12` | `CreateAssignmentInput`, `DeleteAssignmentInput` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/validations/class.ts:22` | `UpdateClassInput` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/validations/quiz.ts:34` | `SubmitQuizAttemptInput` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/validations/roster.ts:12` | `RemoveStudentFromRosterInput` | safe | No module imports this type. |
| type | `apps/science-advantage/lib/validations/student-classes.ts:42` | `StudentEnrolledClassesResponse` | safe | No module imports this type. |
| file | `apps/science-advantage/lib/__tests__/server-only-mock.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/science-advantage/lib/ai/image-generator.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/api-helpers.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/auth/constants.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/auth/types.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/bilingual.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/config/ai-images.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/content-parsers.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/grade4-normalization.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/instrumentation.node.ts:1` |  | needs check | Framework convention file; confirm the framework does not load it. |
| file | `apps/science-advantage/lib/instrumentation.ts:1` |  | needs check | Framework convention file; confirm the framework does not load it. |
| file | `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/bad.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/science-advantage/lib/observability/__tests__/fixtures/eslint/good.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `apps/science-advantage/lib/platform/session-cleanup.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/schemas/lesson-slug.schema.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/schemas/seed-validation.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/schemas/validate-json.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/services/index.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/lib/utils/generateJoinCode.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/scripts/backfill-mastery.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/backfill-thai-titles.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/convert-md-to-structured.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/create-test-users.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/migrate-seed-data.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/seed-activity-data.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/seed/update-seed-files.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/test-curriculum-endpoint.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/scripts/validate-content.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/science-advantage/vitest.integration.global-setup.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/vitest.integration.setup.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/science-advantage/vitest.unit.setup.ts:1` |  | needs check | Only tests import this file. |
| export | `apps/science-advantage/components/features/lesson/image-gallery.tsx:229` | `ImageGallery` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/components/features/lesson/lesson-player.tsx:290` | `BlockErrorBoundary` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/ai/recommendation-service.ts:58` | `RecommendationService` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/auth/session.ts:24` | `createSession` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/gamification/badges.ts:240` | `evaluateAllBadges` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/gamification/streak.ts:25` | `updateStreak`, `getStreakMilestoneBonus` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/quiz/scoring.ts:88` | `calculateTotalScore`, `calculatePercentage` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/schemas/lesson-content.schema.ts:309` | `validateLessonContent`, `isValidLessonContent` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/lib/utils/join-code-format.ts:10` | `JOIN_CODE_CHARSET`, `isValidJoinCodeFormat` | needs check | Only tests use this symbol. |
| export | `apps/science-advantage/scripts/migrate-lesson-content.ts:724` | `parseArgs` | needs check | Export in a manual script. |
| type | `apps/science-advantage/components/features/student/ai-recommendation-card.tsx:25` | `RecommendationApiResponse` | needs check | Only tests use this symbol. |
| type | `apps/science-advantage/lib/ai/recommendation-context.ts:331` | `AttemptWithRelations` | needs check | Only tests use this symbol. |
| type | `apps/science-advantage/lib/interventions/detect-alerts.ts:23` | `MasteryRecord` | needs check | Only tests use this symbol. |
| type | `apps/science-advantage/lib/platform/cache-adapter.ts:14` | `CacheAdapter` | needs check | Only tests use this symbol. |
| type | `apps/science-advantage/lib/platform/rate-limit-store.ts:1` | `RateLimitStore` | needs check | Only tests use this symbol. |
| type | `apps/science-advantage/scripts/migrate-lesson-content.ts:732` | `CliOptions`, `MigrationResult`, `MigrationReport`, `MigrationMetadata` | needs check | Export in a manual script. |
| file | `apps/science-advantage/lib/__tests__/vitest.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/science-advantage/vitest.integration.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/science-advantage/vitest.scripts.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/science-advantage/vitest.unit.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `apps/science-advantage/vitest.verification.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/storytime

Safe 0, needs check 36, false positive 0, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `apps/storytime/lib/blend.ts:1` |  | needs check | Only tests import this file. |
| file | `apps/storytime/lib/contracts/week.ts:1` |  | needs check | Only tests import this file. |
| export | `apps/storytime/lib/blend.ts:41` | `taughtGraphemes`, `trickyWords` | needs check | Open track changes this package. |
| export | `apps/storytime/lib/contracts/week.ts:52` | `imageSchema`, `wordTimingSchema`, `sentenceTimepointSchema`, `bookAudioSchema`, `bookPageSchema`, `soundsPageSchema`, `bookSchema`, `elementSchema`, `familyWordSchema`, `focusSchema`, `openingSchema`, `songLineSchema`, `songSchema`, `noteSchema`, `stepSchema`, `scriptSchema`, `stripCardSchema`, `stripSchema`, `checkItemSchema`, `checkSchema`, `homeSchema`, `tagsSchema`, `metaSchema`, `PUBLISHED_BOOK_KINDS` | needs check | Open track changes this package. |
| export | `apps/storytime/scripts/receive-weeks.ts:244` | `resolveCommit` | needs check | Open track changes this package. |
| type | `apps/storytime/lib/blend.ts:11` | `BlendPlan` | needs check | Open track changes this package. |
| type | `apps/storytime/lib/contracts/week.ts:555` | `StorytimeBook`, `StorytimeSentence` | needs check | Open track changes this package. |
| type | `apps/storytime/scripts/receive-weeks.ts:34` | `ReceivedWeek`, `WeekSourceFile`, `StagedFile`, `StagedOps` | needs check | Open track changes this package. |

### apps/workbooks

Safe 42, needs check 6, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `apps/workbooks/lib/html-to-pdf.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/workbooks/app/drafts/[draftId]/lesson-mapping.ts:8` | `draftLessonParagraphSchema`, `draftLessonQuestionSchema`, `draftLessonVocabularyItemSchema`, `draftLessonMatchItemSchema`, `draftLessonFillItemSchema`, `draftLessonOrderQuestionSchema`, `draftLessonCompletionPromptSchema`, `draftLessonMcAnswerSchema`, `draftLessonOrderAnswerSchema`, `draftLessonTranslationParagraphSchema`, `draftLessonArticleImagePositionSchema` | safe | No module imports this export. |
| export | `apps/workbooks/lib/legacy-import-manifest.ts:6` | `LEGACY_IMPORT_DIGEST_ALGORITHM`, `legacyImportExceptionSchema`, `legacyImportProvenanceSchema`, `legacyImportManifestEntrySchema`, `resolveLegacyLessonSourceId`, `computeLegacyImportObjectKey`, `resolveImportSourceApp` | safe | No module imports this export. |
| type | `apps/workbooks/app/drafts/[draftId]/actions.ts:19` | `GetDraftResult`, `PreviewDraftResult`, `UpdateDraftResult`, `UpdateDraftSettingsResult`, `TransitionDraftResult` | safe | No module imports this type. |
| type | `apps/workbooks/app/drafts/[draftId]/draft-editor-view.tsx:27` | `DraftEditorViewProps` | safe | No module imports this type. |
| type | `apps/workbooks/app/drafts/[draftId]/use-draft-lesson-editor.ts:14` | `UseDraftLessonEditorParams`, `UseDraftLessonEditorResult` | safe | No module imports this type. |
| type | `apps/workbooks/app/drafts/actions.ts:16` | `PublishDraftResult` | safe | No module imports this type. |
| type | `apps/workbooks/app/lib/workbook-levels.ts:4` | `WorkbookLevelOption` | safe | No module imports this type. |
| type | `apps/workbooks/app/lib/workbook-permissions.ts:2` | `WorkbookRole`, `WorkbookPermission` | safe | No module imports this type. |
| type | `apps/workbooks/app/projects/project-list-view.tsx:7` | `ProjectListViewProps` | safe | No module imports this type. |
| type | `apps/workbooks/app/projects/teacher-manual-modal.tsx:19` | `TeacherManualModalProps` | safe | No module imports this type. |
| type | `apps/workbooks/app/projects/teacher-manual-section.tsx:8` | `TeacherManualSectionProps` | safe | No module imports this type. |
| type | `apps/workbooks/app/teacher-manual-actions.ts:21` | `CompileTeacherManualResult` | safe | No module imports this type. |
| type | `apps/workbooks/components/lesson-editor/use-json-field.ts:6` | `JsonFieldState` | safe | No module imports this type. |
| type | `apps/workbooks/lib/legacy-import-manifest.ts:27` | `LegacyImportException`, `LegacyImportProvenance`, `LegacyImportManifestEntry`, `LegacyImportManifest`, `LegacyImportManifestProjectInput`, `LegacyImportManifestFileInput` | safe | No module imports this type. |
| file | `apps/workbooks/lib/legacy-import-manifest.ts:1` |  | needs check | Only tests import this file. |
| export | `apps/workbooks/app/drafts/[draftId]/lesson-mapping.ts:90` | `draftLessonArticleImageSchema` | needs check | Only tests use this symbol. |
| export | `apps/workbooks/app/lib/workbook-levels.ts:16` | `SECONDARY_LEVELS`, `PRIMARY_LEVELS` | needs check | Only tests use this symbol. |
| export | `apps/workbooks/app/lib/workbook-permissions.ts:15` | `WORKBOOK_PERMISSIONS`, `WORKBOOK_ROLE_PERMISSIONS` | needs check | Only tests use this symbol. |
| file | `apps/workbooks/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### apps/www-reading-advantage

Safe 49, needs check 21, false positive 95, unreachable modules 2.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `apps/www-reading-advantage/public/` | | false positive | Every code file in this directory is unused. |
| module | `apps/www-reading-advantage/revideo/` | | needs check | Every code file in this directory is unused. |
| file | `apps/www-reading-advantage/src/components/blog/blog-layout.tsx:1` |  | safe | No import, script, or config reaches this file. |
| file | `apps/www-reading-advantage/src/components/products/product-card.tsx:1` |  | safe | No import, script, or config reaches this file. |
| export | `apps/www-reading-advantage/src/components/marketing/mastery-panels.tsx:6` | `MASTERY_COLORS` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/components/ui/button.tsx:64` | `buttonVariants` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/components/ui/card.tsx:100` | `CardHeader`, `CardFooter`, `CardTitle`, `CardDescription` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/components/ui/select.tsx:155` | `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/components/ui/sheet.tsx:137` | `SheetPortal`, `SheetOverlay`, `SheetClose`, `SheetFooter` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/config/locale-config.ts:21` | `localeImports`, `feedbackLanguage` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/lib/blog.ts:235` | `getAllBlogPosts`, `getAllBlogTags` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/lib/seo.ts:29` | `resolveMarketingLocale` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/locales/client.ts:3` | `useI18n` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/locales/navigation.ts:7` | `redirect`, `getPathname` | safe | No module imports this export. |
| export | `apps/www-reading-advantage/src/locales/server.ts:1` | `getI18n` | safe | No module imports this export. |
| type | `apps/www-reading-advantage/src/components/marketing/hero-section.tsx:8` | `HeroProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/marketing/mastery-panels.tsx:15` | `MasteryStateLabels` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/marketing/tutor-class-stepper.tsx:7` | `TutorPhase` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/button.tsx:41` | `ButtonProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/card.tsx:4` | `CardProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/faq-accordion.tsx:7` | `FAQItem`, `FAQAccordionProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/floating-pill.tsx:4` | `FloatingPillProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/horizontal-strip.tsx:4` | `HorizontalStripProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/large-image-break.tsx:5` | `LargeImageBreakProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/overlapping-section.tsx:4` | `OverlappingSectionProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/components/ui/step-flow.tsx:4` | `Step`, `StepFlowProps` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/config/locale-config.ts:10` | `LocaleConfig` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/lib/blog.ts:19` | `SupportedLocale`, `PaginatedPosts` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/lib/seo.ts:13` | `MarketingLocale` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/testing/product-claim-helper.ts:244` | `AuditReport`, `ClaimArtifact`, `ClaimKind`, `ConsentProof`, `ProductClaimHelper` | safe | No module imports this type. |
| type | `apps/www-reading-advantage/src/types/blog.ts:35` | `BlogTagsProps` | safe | No module imports this type. |
| file | `apps/www-reading-advantage/revideo/project.ts:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/revideo/scenes/blog-video.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/revideo/scenes/intro.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/revideo/scenes/outro.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/revideo/test-project.ts:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/revideo/test-scene.tsx:1` |  | needs check | Video tool entry; a CLI or a generated project file loads it by path. |
| file | `apps/www-reading-advantage/scripts/__tests__/i18n-cli.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/www-reading-advantage/scripts/generate-blog-video.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/www-reading-advantage/scripts/regression-test-video-pipeline.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/www-reading-advantage/scripts/test-revideo.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/www-reading-advantage/scripts/test-vite.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `apps/www-reading-advantage/src/components/common/localized-link.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/www-reading-advantage/src/components/contact/contact-form.tsx:1` |  | needs check | Only tests import this file. |
| file | `apps/www-reading-advantage/src/i18n.ts:1` |  | needs check | Framework convention file; confirm the framework does not load it. |
| export | `apps/www-reading-advantage/src/components/marketing/mastery-advantage-graph.tsx:44` | `DEFAULT_GRAPH_LABELS`, `buildSteps` | needs check | Only tests use this symbol. |
| export | `apps/www-reading-advantage/src/config/locale-config.ts:5` | `localeConfig` | needs check | Only tests use this symbol. |
| export | `apps/www-reading-advantage/src/config/navigation.ts:5` | `navigation`, `productLinks` | needs check | Only tests use this symbol. |
| export | `apps/www-reading-advantage/src/lib/blog.ts:74` | `postsDirectory`, `calculateReadingTime` | needs check | Only tests use this symbol. |
| file | `apps/www-reading-advantage/public/experience/assets/abyssal-well-BPAumkBw.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/abyssal-well-DZLoCwfJ.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/alchemists-synthesis-AI2Dhczs.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/alchemists-synthesis-BJKaZXpN.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/archers-revenge-DUPUpiPq.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/archers-revenge-Fbwp9-Jl.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/arena-DaM-0cZc.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/astral-mage-BjcYa8U6.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/astral-mage-CqTL4_Mv.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/camera-DMVXrYDy.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/castle-defense-C3o1u9gd.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/castle-defense-Ry0ZTK85.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/devourer-slime-Bcf9aU3Z.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/devourer-slime-dSiI-QDa.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/dragon-flight-BNPZJSTV.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/dragon-flight-CyLtWZIz.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/dragon-rider-DnbJRQRf.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/dragon-rider-wKVEDuAQ.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/dungeon-liberator-9fxPyDrD.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/enchanted-library-Bg7eMVzi.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/enchanted-library-DaRSvEHh.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/griffin-D2Cbk0L0.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/griffin-riders-escape-CAfkOLfX.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/griffin-riders-escape-Cdjn8KIr.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/griffin-sky-joust-B78DBInn.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/griffin-sky-joust-CKfsd0g2.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/gryphon-patrol-DFyq6Lvr.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/gryphon-patrol-znzSv4VB.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/haunted-library-BSvz3qId.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/haunted-library-Cd14B11q.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/hero-vs-zombie-D8o62H9q.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/hero-vs-zombie-DSqY3pNd.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/hud-CK-u5dw1.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/hud-IyagaxPa.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/index-BSU5XJ3M.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/index-CymYZKOR.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/instanced-Ule1FL5d.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/joystick-T_Im3Lyo.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/labyrinth-I4E4zTqu.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/magic-defense-BD_mJR3O.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/magic-defense-tZtGAWDU.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/monster-encounters-Bajdp9Yb.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/paladins-twin-soul-BuV0RwNp.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/paladins-twin-soul-C7nVt8Lh.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/phaser.esm-kk0bm_Sx.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/potion-rush-BuVIAzGo.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/potion-rush-I6gtjiJO.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/realm-carver-CsUVkmQO.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/realm-carver-DWMNochn.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rpg-battle--jzs9Fzl.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rpg-battle-Br9HzL_m.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rune-forge-chamber-sOXKCq9A.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rune-forge-chamber-zheeFysN.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rune-match-DLxaoN8f.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/rune-match-Dr1UHhBK.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/shadow-gate-dungeon-CJUm4Qs0.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/sorcerer-ziggurat-CGqGQ5nG.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/sorcerer-ziggurat-D0qNTVXu.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/spellweavers-run-BxXUDpnt.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/spellweavers-run-D5Zm8eHH.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/stage2d-DqYBka3A.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/storm-castle-tower-BEdYViiA.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/storm-castle-tower-CXNqsm9_.css:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-_QpGkLb0.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-9yf4SYcg.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-B6u3cjlg.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-B9kZQXKL.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-BCVk02dP.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-Bl-6gDHC.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-C2CLm6uK.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-C74cudy5.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-C9f1LNKo.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-CaXNAntD.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-CbhdKm6t.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-CcKjxhFT.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-CkCKbXHc.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-CVwCZiXt.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-D-O_-cYP.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-D1cLP1B-.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-DCE9zVi_.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-DeFJZ4MM.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-DfJ9K9_s.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-Dkb3neWE.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-DYySvXNY.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-fTlluxf_.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-gjxHhTze.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-J-Z6Kd1D.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-j1M7M9Ed.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-OpH_OOsJ.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-rTjalnwU.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings.en-T-fdt_j4.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/strings2.en-BnU7SGVx.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/view2d-ImXgqGPP.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/village-guardian-CeEeb-Nh.js:1` |  | false positive | Static file served from public/, not imported. |
| file | `apps/www-reading-advantage/public/experience/assets/walker-D6FGNyyS.js:1` |  | false positive | Static file served from public/, not imported. |

### packages/activity-react

Safe 0, needs check 8, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| type | `packages/activity-react/src/controllers.ts:75` | `YouTubePlayerPort`, `YouTubeMediaController` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-react/src/interactive-activity-player.tsx:6` | `PlayerAssessment`, `InteractiveActivityPlayerProps`, `InteractiveActivityPlayerLabels` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-react/src/tutorial-activity-panel.tsx:7` | `TutorialStepVerification`, `TutorialSupportUsage`, `TutorialActivityPanelProps` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/activity-react/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/activity-runtime

Safe 1, needs check 20, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/activity-runtime/src/internal/verification.ts:27` | `normalizeVerificationValue` | safe | No module imports this export. |
| export | `packages/activity-runtime/src/persistence.ts:12` | `MAX_ACTIVITY_EVENT_BATCH_SIZE` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/activity-runtime/src/server.ts:15` | `ACTIVITY_SERVER_PORT_VERSION` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/activity-runtime/src/transport.ts:29` | `startActivitySessionInputSchema`, `appendActivityEventsInputSchema`, `getActivitySessionInputSchema`, `assessActivityCheckpointInputSchema`, `assessActivityTutorialInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-runtime/src/authoring.ts:5` | `ActivityAuthoringIssueCode`, `ActivityAuthoringIssue`, `ActivityValidationResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-runtime/src/persistence.ts:15` | `ActivityPersistenceErrorCode`, `CreateActivitySessionRecordInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-runtime/src/server.ts:104` | `CheckpointAssessmentInput`, `TutorialAssessmentInput`, `ActivitySessionSnapshot`, `ActivitySessionStore`, `ActivityEvidenceSink` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-runtime/src/transport.ts:88` | `ActivityTransportDependencies`, `ActivityTransportAssessmentResponse`, `ActivityTransportHandlers` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/activity-runtime/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/activity-tutorial

Safe 0, needs check 11, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/activity-tutorial/src/credentials.ts:3` | `tutorialCredentialClaimsSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/activity-tutorial/src/reporting.ts:7` | `verifiedTutorialReportSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-tutorial/src/checker.ts:10` | `TutorialCheckerPorts` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-tutorial/src/credentials.ts:6` | `TutorialReplayStore` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-tutorial/src/offline.ts:6` | `TutorialQueueStorage`, `QueuedTutorialReport`, `TutorialReportQueue` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-tutorial/src/reporting.ts:11` | `TutorialReportActor`, `TutorialRepositoryVerifier`, `TutorialReportingDependencies` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/activity-tutorial/src/scaffold.ts:6` | `TutorialStarterSource` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/activity-tutorial/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/advantage-play-kit

Safe 2, needs check 794, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| type | `packages/advantage-play-kit/src/assets/standard-pack-suitability-ingestion-negative-fixtures.test-support.ts:16` | `CanonicalIngestionNegativeFixture` | safe | No module imports this type. |
| type | `packages/advantage-play-kit/src/runtime/errors.ts:2` | `APKRuntimeErrorCode` | safe | No module imports this type. |
| file | `packages/advantage-play-kit/scripts/check-accepted-inputs.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/advantage-play-kit/src/assets/asset-contract-v2-test-fixtures.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/advantage-play-kit/src/assets/standard-pack-test-paths.test-support.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/advantage-play-kit/src/assets/asset-contract-v2.ts:51` | `assetContractV2FrameCoordinateSchema`, `assetContractV2TimingSchema`, `assetContractV2ClipSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/assets/index.ts:3` | `parseStandardAssetPath`, `resolveStandardAsset`, `STANDARD_ASSET_VIEWS`, `validateStandardAssetCatalog`, `createStandardAssetCatalog`, `createStandardAssetResolver`, `materializeStandardAssetUnion`, `serializeStandardAssetCatalog`, `serializeStandardAssetCatalogPayload`, `STANDARD_ASSET_REQUIRED_CREDIT`, `ACCEPTED_STANDARD_ASSET_RELEASE`, `createAcceptedStandardAssetResolver`, `createStandardPackAdditiveReleaseReceipt`, `isIssuedStandardPackAdditiveReleaseReceipt`, `serializeStandardPackAdditiveReleaseReceiptPayload`, `standardPackAdditiveReleaseReceiptSchema`, `validateStandardPackAdditiveReleaseReceipt`, `OWNER_APPROVED_CANONICAL_BINDINGS`, `createReleaseBoundSemanticAssetResolver`, `createAcceptedSemanticAssetResolver`, `createDescriptorAwareSemanticAssetResolver`, `createSemanticAssetResolver`, `validateSemanticProductBindings`, `ASSET_CONTRACT_V2_FAILURE_CODES`, `ASSET_CONTRACT_V2_VERSION`, `AssetContractV2ValidationError`, `assetContractV2AdapterDeclarationSchema`, `assetContractV2AnchorSchema`, `assetContractV2ClipSchema`, `assetContractV2CollisionEnvelopeSchema`, `assetContractV2DirectionSchema`, `assetContractV2FrameCoordinateSchema`, `assetContractV2GeometrySchema`, `assetContractV2PhysicalDescriptorSchema`, `assetContractV2ReadabilityEnvelopeSchema`, `assetContractV2ReleaseIdentitySchema`, `assetContractV2SemanticRequirementSchema`, `assetContractV2TimingSchema`, `createAssetContractV2CompatibilityReport`, `serializeAssetContractV2PhysicalDescriptorPayload`, `validateAssetContractV2Descriptor`, `validateAssetContractV2DescriptorForRelease`, `STANDARD_PACK_SUITABILITY_SCHEMA_VERSION`, `standardPackPhysicalBehaviorConstraintsSchema`, `standardPackSuitabilityCandidateSchema`, `standardPackSuitabilityComparisonSchema`, `standardPackSuitabilityCreditSchema`, `standardPackSuitabilityDecisionSchema`, `standardPackSuitabilityDescriptorIdentitySchema`, `standardPackSuitabilityDispositionSchema`, `standardPackSuitabilityLicenseSchema`, `standardPackSuitabilityLimitationSchema`, `standardPackSuitabilityProvenanceSchema`, `standardPackSuitabilityReleaseBindingSchema`, `standardPackSuitabilityRequestSchema`, `standardPackSuitabilityReviewerFindingSchema`, `standardPackSuitabilitySourceEvidenceSchema`, `standardPackLegacySourceInventoryBindingSchema`, `standardPackLegacySourcePacketDocumentSchema`, `standardPackLegacySourcePacketSchema`, `createExistingCoreTask5CanonicalReusePackage`, `EXISTING_CORE_TASK5_CANONICAL_REUSE_INPUTS`, `compareCanonicalSuitabilityDescriptor`, `createCanonicalSuitabilitySearch`, `resolveAcceptedCanonicalReuse`, `serializeStandardPackCohortSuitabilityBindingPayload`, `standardPackCohortSuitabilityEvidenceSchema`, `validateStandardPackCohortSuitabilityEvidence`, `createStandardPackIngestionLedgerPredecessorIndex`, `createStandardPackIngestionLedgerSuccessorCommitment`, `serializeStandardPackIngestionLedgerPayload`, `serializeStandardPackIngestionLedgerPredecessorIndexPayload`, `serializeStandardPackIngestionLedgerSuccessorCommitmentPayload`, `standardPackIngestionLedgerHistoricalIdentitySchema`, `standardPackIngestionLedgerPredecessorIndexSchema`, `standardPackIngestionLedgerSuccessorCommitmentSchema`, `standardPackIngestionLedgerEntrySchema`, `standardPackIngestionLedgerSchema`, `isValidatedStandardPackIngestionLedger`, `validateStandardPackIngestionLedger` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-additive-release.ts:31` | `standardPackAdditiveReleaseReceiptSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.ts:72` | `standardPackIngestionLedgerEntrySchema`, `standardPackIngestionLedgerHistoricalIdentitySchema`, `standardPackIngestionLedgerPredecessorIndexSchema`, `standardPackIngestionLedgerSuccessorCommitmentSchema`, `serializeStandardPackIngestionLedgerSuccessorCommitmentPayload`, `createStandardPackIngestionLedgerSuccessorCommitment` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-legacy-source-packet.ts:36` | `standardPackLegacySourceInventoryBindingSchema`, `standardPackLegacySourcePacketDocumentSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-suitability-ingestion-negative-fixtures.test-support.ts:195` | `CANONICAL_INGESTION_NEGATIVE_FIXTURES` | needs check | Only tests use this symbol. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-suitability-test-fixtures.test-support.ts:157` | `SUITABLE_HERO_01_REUSE_FIXTURE`, `VISUALLY_SIMILAR_INCOMPATIBLE_FIXTURE`, `BLOCKED_ABSENCE_FIXTURE` | needs check | Only tests use this symbol. |
| export | `packages/advantage-play-kit/src/assets/standard-pack-suitability.ts:10` | `STANDARD_PACK_SUITABILITY_SCHEMA_VERSION`, `standardPackSuitabilityDispositionSchema`, `standardPackSuitabilityDescriptorIdentitySchema`, `standardPackSuitabilityReviewerFindingSchema`, `standardPackSuitabilityLimitationSchema`, `standardPackSuitabilityProvenanceSchema`, `standardPackSuitabilityReleaseBindingSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/diagnostics/index.ts:2` | `APKBlockedScopeError`, `APKUnsupportedCapabilityError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/editions/editions.ts:95` | `runtimeEditionSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/editions/index.ts:3` | `preloadAssetBindings`, `registerAssetAnimations`, `resolveAssetBinding`, `resolveEdition`, `runtimeEditionSchema`, `validateEdition`, `validateEditionPair`, `REQUIRED_PHYSICAL_ASSETS`, `validateCompleteAssetPack`, `CHARACTER_COLLISION`, `CHARACTER_ORIGIN`, `DOOR_PROP_GRID`, `FOUR_FRAME_PROP_GRID`, `FOUR_FRAME_VFX_GRID`, `ISOMETRIC_WANG_TILE_GRID`, `SIDE_SCROLL_CHARACTER_ANIMATIONS`, `SIDE_SCROLL_CHARACTER_GRID`, `TOP_DOWN_CHARACTER_ANIMATIONS`, `TOP_DOWN_CHARACTER_GRID`, `WANG_MASK_FRAMES`, `WANG_TILE_GRID`, `createAnimationKey`, `createTextureKey` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/guards/index.ts:4` | `assertAcceptedInputs`, `assertAcceptedStandardPackBinding`, `isAcceptedCapabilityId`, `rejectBlockedScope`, `rejectUnsupportedCapability`, `assertPresentationBlocked`, `assertResponsiveCompositionBlocked`, `createResponsiveCompositionGuard`, `PRESENTATION_BLOCKED_DIAGNOSTIC`, `RESPONSIVE_BLOCKED_DIAGNOSTIC`, `EDITIONS_MODULE_PATH`, `isEditionsModulePath`, `LEGACY_EDITION_POLICY_DIAGNOSTIC` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/game-briefing-contract.ts:9` | `gameBriefingTextSchema`, `gameBriefingControlSchema`, `gameBriefingStartPhaseSchema`, `gameLifecyclePhaseSchema`, `gameLifecycleEventSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/game-presentation.tsx:12` | `gameBriefingControlHintSchema`, `gameBriefingControlSchema`, `gameBriefingInstructionSchema`, `gameBriefingLabelsSchema`, `gameBriefingLearningPreviewSchema`, `gameBriefingSchema`, `gameBriefingStartPhaseSchema`, `gameBriefingTextSchema`, `gameLifecycleEventSchema`, `gameLifecyclePhaseSchema`, `resolveGameBriefingStartPhase` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/game-tutorial-contract.ts:8` | `gameTutorialTextSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/index.ts:3` | `EducationalPrompt`, `GameErrorState`, `GameFeedback`, `GameHud`, `GameLoadingState`, `GameBriefingScreen`, `GameNavigationControls`, `GameProgress`, `GameResultPanel`, `InstructionsPanel`, `PresentationShell`, `RpgRewardPanel`, `RpgRewardDisclosure`, `RPG_REWARD_LABELS`, `RpgUnlockNotice`, `RPG_REWARD_ASSET_PATHS`, `RPG_REWARD_REQUIRED_CREDIT`, `resolveRpgRewardAssetUrls`, `hasStandardGameExperience`, `STANDARD_GAME_REQUIRED_CREDIT`, `standardGameDebriefSchema`, `standardGameExperienceDefinitionSchema`, `validateStandardGameExperienceDefinition`, `gameTutorialActionConsequenceSchema`, `gameTutorialActionSchema`, `gameTutorialLabelsSchema`, `gameTutorialLifecyclePolicySchema`, `gameTutorialStepSchema`, `gameTutorialStepTimingSchema`, `gameTutorialTargetKindSchema`, `gameTutorialTargetSchema`, `gameTutorialTextSchema`, `createGameTutorialRuntime`, `GameTutorialScreen`, `createGameTutorialQcFixture`, `gameBriefingControlHintSchema`, `gameBriefingControlSchema`, `gameBriefingInstructionSchema`, `gameBriefingLabelsSchema`, `gameBriefingLearningPreviewSchema`, `gameBriefingSchema`, `gameBriefingStartPhaseSchema`, `gameBriefingTextSchema`, `gameLifecycleEventSchema`, `gameLifecyclePhaseSchema`, `resolveGameBriefingStartPhase` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/rpg-reward-assets.ts:9` | `RPG_REWARD_ASSET_PATHS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/rpg-reward-labels.ts:40` | `RPG_REWARD_LABELS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/presentation/standard-game-experience.ts:31` | `standardGameExperienceDefinitionSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/qc/index.ts:3` | `createAssetContractV2QcDiagnostic`, `createBrowserQcDriver`, `createPerformanceMonitor`, `createStandardPackSuitabilityQcView`, `parseQcControls`, `qcControlsSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/react/index.ts:2` | `APKGameHost`, `StandardAssetGallery`, `useStudentRpg`, `StudentRpgCatalogPanel`, `startStudentReadingChallengeRun`, `useStudentChallengeRun`, `StudentChallengeCatalogPanel`, `STUDENT_CHALLENGE_CATALOG_LABELS`, `TeacherChallengePanel`, `TEACHER_CHALLENGE_PANEL_LABELS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/react/student-challenge-catalog-panel.tsx:54` | `STUDENT_CHALLENGE_CATALOG_LABELS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/react/teacher-challenge-panel.tsx:65` | `TEACHER_CHALLENGE_PANEL_LABELS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/react/use-student-challenge-run.ts:63` | `startStudentReadingChallengeRun` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/responsive/index.ts:3` | `DEFAULT_RESPONSIVE_LAYOUT_CONFIG`, `responsiveLayoutConfigSchema`, `containerPointToWorld`, `createResponsiveDebugOverlays`, `createResponsiveTransitionCoordinator`, `evaluateTextFit`, `inspectCompositionGeometry`, `resolveResponsiveComposition`, `worldPointToContainer`, `resolveBrowserSafeAreaInsets` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/responsive/renderer.ts:10` | `RENDERER_SETTINGS_KEY`, `detectRenderer`, `readFlatMode`, `saveFlatMode` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/responsive/responsive-composition.ts:607` | `createResponsiveDebugOverlays` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/runtime/index.ts:2` | `mountCartridge`, `createPhaserGameFactory`, `createActorSpriteLayer`, `createInputController`, `APKRuntimeError`, `toAPKRuntimeError`, `runtimeCartridgeManifestSchema`, `validateRuntimeCartridgeManifest`, `APK_RUNTIME_API_VERSION` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/scaffolding/exemplar.ts:51` | `EXEMPLAR_SEMANTIC_ASSET_REQUIREMENTS`, `EXEMPLAR_XP_POLICY` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/scaffolding/index.ts:3` | `ACCEPTED_STANDARD_PACK_BINDING`, `cartridgeManifestSchema`, `validateCartridgeManifest`, `generateCartridgeScaffold`, `buildExemplarCartridgeDefinition`, `buildExemplarPublicApiSurface`, `EXEMPLAR_CARTRIDGE_ID`, `EXEMPLAR_SEMANTIC_ASSET_REQUIREMENTS`, `EXEMPLAR_SIX_FRAME_WALK_DESCRIPTOR`, `EXEMPLAR_WALK_SEMANTIC_REQUIREMENT`, `EXEMPLAR_XP_POLICY`, `runExemplarSimulation` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/systems/capability-manifest.ts:275` | `BLOCKED_SCOPES` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit/src/systems/index.ts:3` | `ACCEPTED_CAPABILITY_IDS`, `ACCEPTED_CAPABILITY_REGISTRY`, `ACCEPTED_T10_INPUTS`, `BLOCKED_SCOPES`, `buildAcceptedCapabilityManifest`, `BOUNDED_FRAME_DELTA_CEILING_MS`, `clampFrameDelta`, `createBoundedFrameScheduler`, `createInputActionNormalizer`, `INPUT_ACTION_IDS`, `createLanguageTargetProgression`, `assertNonEmptyContent`, `isBlank`, `validateNonEmptyContent`, `accumulateResult`, `calculateXp`, `createResultAccountant`, `finalizeResult`, `RESULT_ACCOUNTING_ZERO_ATTEMPTS_XP`, `createCompletionLatch`, `createCountdownTimer`, `createStopwatchTimer`, `advanceBody`, `createDeterministicSpawner`, `createObjectPool`, `intersects`, `stepProjectile`, `createGridNavigator`, `createMultiplayerSession` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/accepted-standard-pack-release.ts:13` | `StandardAssetDownstreamConsumptionRules`, `StandardAssetAcceptanceEvidence`, `AcceptedStandardAssetRelease` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/asset-contract-v2.ts:21` | `AssetContractV2FailureCode`, `AssetContractV2Timing`, `AssetContractV2Clip`, `AssetContractV2AdapterDeclaration`, `AssetContractV2CompatibilityReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/existing-core-suitability.ts:211` | `ExistingCoreTask5CanonicalReuseInput`, `ExistingCoreTask5SelectedUnionInput`, `ExistingCoreTask5DispositionRow`, `ExistingCoreTask5OwnerAcceptance`, `ExistingCoreTask5SemanticBindingEvidence`, `ExistingCoreTask5CanonicalReusePackage` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/index.ts:9` | `AssetCellSize`, `ResolvedStandardAsset`, `StandardAssetPath`, `StandardAssetView`, `CreateStandardAssetCatalogInput`, `StandardAssetCatalog`, `StandardAssetCatalogEntry`, `StandardAssetReleaseBinding`, `StandardAssetResolver`, `StandardPackAdditiveReleaseReceipt`, `AssetContractV2SemanticRegistration`, `AssetContractV2SemanticResolver`, `AssetContractV2SemanticSelection`, `SemanticAssetRegistration`, `SemanticAssetRequirement`, `SemanticAssetSelection`, `SemanticProductAssetResolver`, `SemanticProductBindingManifest`, `StandardPackSemanticPublicationEvidenceBundle`, `AcceptedStandardAssetRelease`, `StandardAssetAcceptanceEvidence`, `StandardAssetDownstreamConsumptionRules`, `AssetContractV2AdapterDeclaration`, `AssetContractV2Anchor`, `AssetContractV2Clip`, `AssetContractV2CollisionEnvelope`, `AssetContractV2CompatibilityReport`, `AssetContractV2Direction`, `AssetContractV2FailureCode`, `AssetContractV2FrameCoordinate`, `AssetContractV2Geometry`, `AssetContractV2PhysicalDescriptor`, `AssetContractV2ReadabilityEnvelope`, `AssetContractV2ReleaseIdentity`, `AssetContractV2SemanticRequirement`, `AssetContractV2Timing`, `StandardPackLegacySourceInventoryBinding`, `StandardPackLegacySourcePacket`, `StandardPackLegacySourcePacketDocument`, `StandardPackPhysicalBehaviorConstraints`, `StandardPackSuitabilityCandidate`, `StandardPackSuitabilityComparison`, `StandardPackSuitabilityCredit`, `StandardPackSuitabilityDecision`, `StandardPackSuitabilityDescriptorIdentity`, `StandardPackSuitabilityDisposition`, `StandardPackSuitabilityLicense`, `StandardPackSuitabilityLimitation`, `StandardPackSuitabilityProvenance`, `StandardPackSuitabilityReleaseBinding`, `StandardPackSuitabilityRequest`, `StandardPackSuitabilityReviewerFinding`, `StandardPackSuitabilitySourceEvidence`, `ExistingCoreTask5CanonicalReuseInput`, `ExistingCoreTask5CanonicalReusePackage`, `ExistingCoreTask5DispositionRow`, `ExistingCoreTask5OwnerAcceptance`, `ExistingCoreTask5SemanticBindingEvidence`, `ExistingCoreTask5SelectedUnionInput`, `AcceptedCanonicalReuseSelection`, `CanonicalSuitabilitySearch`, `CanonicalSuitabilitySearchResult`, `CanonicalSuitabilityTechnicalComparison`, `CanonicalSuitabilityTechnicalFactors`, `StandardPackCohortSuitabilityEvidence`, `StandardPackCohortSuitabilityReceipt`, `StandardPackIngestionLedger`, `StandardPackIngestionLedgerEntry`, `StandardPackIngestionLedgerHistoricalIdentity`, `StandardPackIngestionLedgerPredecessorIndex`, `StandardPackIngestionLedgerSuccessorCommitment`, `StandardPackIngestionLedgerSuccessorRegistry`, `StandardPackIngestionLedgerEvidenceBundle` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/semantic-product-bindings.ts:87` | `SemanticProductBindingManifest`, `StandardPackSemanticPublicationEvidenceBundle`, `SemanticAssetRegistration`, `SemanticAssetSelection`, `AssetContractV2SemanticSelection`, `AssetContractV2SemanticResolver`, `SemanticProductAssetResolver` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-asset-contract.ts:22` | `StandardAssetPath`, `ResolvedStandardAsset` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-cohort-suitability.ts:40` | `StandardPackCohortSuitabilityEvidence`, `StandardPackCohortSuitabilityReceipt` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-ingestion-ledger.ts:99` | `StandardPackIngestionLedgerEntry`, `StandardPackIngestionLedgerHistoricalIdentity`, `StandardPackIngestionLedgerPredecessorIndex`, `StandardPackIngestionLedgerSuccessorCommitment`, `StandardPackIngestionLedgerSuccessorRegistry`, `StandardPackIngestionLedgerEvidenceBundle` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-legacy-source-packet.ts:48` | `StandardPackLegacySourceInventoryBinding`, `StandardPackLegacySourcePacketDocument` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-release.ts:52` | `CreateStandardAssetCatalogInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-suitability-search.ts:41` | `CanonicalSuitabilityTechnicalFactors`, `CanonicalSuitabilityTechnicalComparison`, `AcceptedCanonicalReuseSelection` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/assets/standard-pack-suitability.ts:52` | `StandardPackSuitabilityDisposition`, `StandardPackSuitabilityDescriptorIdentity`, `StandardPackSuitabilityReviewerFinding`, `StandardPackSuitabilityLimitation`, `StandardPackSuitabilityProvenance`, `StandardPackSuitabilityLicense`, `StandardPackSuitabilityReleaseBinding` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/audio/browser-playback.ts:9` | `BrowserPreparedAudioClip`, `BrowserAudioClipPortOptions`, `BrowserAudioClipPorts` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/diagnostics/index.ts:3` | `BlockedScope` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/editions/editions.ts:111` | `AssetUrlResolver`, `PhysicalAssetLoader`, `PhysicalAnimationManager`, `ResolvedAssetBinding` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/editions/index.ts:17` | `PhysicalAssetRequirement`, `AssetUrlResolver`, `PhysicalAnimationManager`, `PhysicalAssetLoader`, `ResolvedAssetBinding`, `AssetAnimation`, `AssetCollisionBox`, `AssetOrigin`, `AssetPackManifest`, `AssetProvenance`, `AssetView`, `AudienceTuning`, `FrameGrid`, `NineSliceInsets`, `PhysicalAssetFile`, `PhysicalAssetKind`, `RuntimeEdition`, `SemanticAssetBinding`, `SemanticAssetUsage` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/editions/required-pack.ts:27` | `PhysicalAssetRequirement` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/guards/blocked-scopes.ts:21` | `ResponsiveBlockedDiagnostic`, `ViewportDimensions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/guards/index.ts:10` | `AcceptedInputsGuard`, `ResponsiveBlockedDiagnostic`, `ViewportDimensions`, `LegacyEditionPolicy`, `LegacyEditionPolicyDiagnostic` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/guards/legacy-edition-policy.ts:19` | `LegacyEditionPolicyDiagnostic`, `LegacyEditionPolicy` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-briefing-contract.ts:18` | `GameBriefingInstruction`, `GameBriefingLearningPreview`, `GameBriefingControlHint`, `GameBriefingControl`, `GameBriefingLabels`, `GameBriefingStartPhase`, `GameLifecyclePhase`, `GameLifecycleEvent` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-briefing-screen.tsx:22` | `GameBriefingScreenProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-presentation.tsx:28` | `GameBriefing`, `GameBriefingControl`, `GameBriefingControlHint`, `GameBriefingInstruction`, `GameBriefingLabels`, `GameBriefingLearningPreview`, `GameBriefingStartPhase`, `GameLifecycleEvent`, `GameLifecyclePhase`, `GameLifecycleTransition`, `GameBriefingScreenProps`, `PresentationShellProps`, `GameLoadingStateProps`, `GameErrorStateProps`, `InstructionsPanelProps`, `EducationalPromptProps`, `GameProgressProps`, `GameHudProps`, `GameFeedbackProps`, `GameNavigationControlsProps`, `GameResultPanelProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-tutorial-contract.ts:21` | `GameTutorialTargetKind`, `GameTutorialActionConsequence`, `GameTutorialStepTiming`, `GameTutorialLabels`, `GameTutorialLifecyclePolicy`, `GameTutorialCommand` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-tutorial-controller.ts:27` | `CreateGameTutorialControllerOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/game-tutorial-screen.tsx:10` | `GameTutorialScreenProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/index.ts:18` | `EducationalPromptProps`, `GameErrorStateProps`, `GameFeedbackProps`, `GameHudProps`, `GameLoadingStateProps`, `GameBriefingScreenProps`, `GameNavigationControlsProps`, `GameProgressProps`, `GamePersistenceState`, `GameResultPanelProps`, `InstructionsPanelProps`, `PresentationShellProps`, `RpgRewardAssetUrls`, `RpgRewardPanelProps`, `RpgRewardDisclosureProps`, `RpgRewardLabels`, `RpgRewardLabelsInput`, `RpgUnlockNoticeProps`, `StandardExperienceCartridge`, `StandardGameDebrief`, `StandardGameExperienceDefinition`, `StandardGameExperienceRuntime`, `GameTutorialScreenProps`, `CreateGameTutorialRuntimeOptions`, `GameTutorialClock`, `GameTutorialDiagnostic`, `GameTutorialEffects`, `GameTutorialResourceCounts`, `GameTutorialRuntime`, `GameTutorialRuntimeSnapshot`, `CreateGameTutorialControllerOptions`, `GameTutorialControllerSnapshot`, `CreateTutorialActionDriverContext`, `GameTutorialAction`, `GameTutorialActionConsequence`, `GameTutorialActionDiagnostics`, `GameTutorialActionDriverFrameContext`, `GameTutorialAnswerAudioPort`, `GameTutorialCommand`, `GameTutorialLabels`, `GameTutorialLifecyclePolicy`, `GameTutorialProgress`, `GameTutorialStep`, `GameTutorialStepTiming`, `GameTutorialTarget`, `GameTutorialTargetKind`, `GameBriefing`, `GameBriefingControl`, `GameBriefingControlHint`, `GameBriefingInstruction`, `GameBriefingLabels`, `GameBriefingLearningPreview`, `GameBriefingStartPhase`, `GameLifecycleEvent`, `GameLifecyclePhase`, `GameLifecycleTransition` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/rpg-reward-disclosure.tsx:8` | `RpgRewardDisclosureProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/rpg-unlock-notice.tsx:18` | `RpgUnlockNoticeProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/presentation/standard-game-experience.ts:74` | `StandardExperienceCartridge` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/qc/index.ts:13` | `AssetContractV2QcAnimationBehavior`, `AssetContractV2QcDiagnostic`, `AssetContractV2QcPhysicalDescriptorView`, `AssetContractV2QcSemanticIdentity`, `BrowserQcDriver`, `BrowserQcLocator`, `BrowserQcPageAdapter`, `PerformanceBudgets`, `PerformanceMetric`, `PerformanceMonitor`, `PerformanceReport`, `PerformanceSample`, `PerformanceViolation`, `QcControls`, `StandardPackSuitabilityQcAcceptanceView`, `StandardPackSuitabilityQcAuthorizationView`, `StandardPackSuitabilityQcCandidateView`, `StandardPackSuitabilityQcDecisionView`, `StandardPackSuitabilityQcDescriptorView`, `StandardPackSuitabilityQcLicenseView`, `StandardPackSuitabilityQcLimitationView`, `StandardPackSuitabilityQcProvenanceView`, `StandardPackSuitabilityQcReviewerFindingView`, `StandardPackSuitabilityQcSemanticView`, `StandardPackSuitabilityQcView` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/qc/qc-kit.ts:29` | `AssetContractV2QcSemanticIdentity`, `AssetContractV2QcPhysicalDescriptorView`, `AssetContractV2QcAnimationBehavior`, `AssetContractV2QcDiagnostic`, `StandardPackSuitabilityQcSemanticView`, `StandardPackSuitabilityQcDescriptorView`, `StandardPackSuitabilityQcReviewerFindingView`, `StandardPackSuitabilityQcProvenanceView`, `StandardPackSuitabilityQcLicenseView`, `StandardPackSuitabilityQcCandidateView`, `StandardPackSuitabilityQcLimitationView`, `StandardPackSuitabilityQcDecisionView`, `StandardPackSuitabilityQcAuthorizationView`, `StandardPackSuitabilityQcAcceptanceView`, `StandardPackSuitabilityQcView`, `PerformanceBudgets`, `PerformanceSample`, `PerformanceMetric`, `PerformanceViolation`, `PerformanceReport`, `PerformanceMonitor`, `BrowserQcLocator`, `BrowserQcPageAdapter`, `BrowserQcDriver` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/index.ts:7` | `APKGameHostProps`, `APKHostCompletionConfirmation`, `StandardAssetGalleryProps`, `UseStudentRpgOptions`, `UseStudentRpgResult`, `StudentRpgCatalogPanelProps`, `UseStudentChallengeRunOptions`, `UseStudentChallengeRunResult`, `StudentChallengeCatalogGame`, `StudentChallengeCatalogLabels`, `StudentChallengeCatalogPanelProps`, `TeacherChallengeGame`, `TeacherChallengePanelLabels`, `TeacherChallengePanelProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/standard-asset-gallery.tsx:8` | `StandardAssetGalleryProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/student-challenge-catalog-panel.tsx:23` | `StudentChallengeCatalogGame`, `StudentChallengeCatalogLabels`, `StudentChallengeCatalogPanelProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/student-rpg-catalog-panel.tsx:13` | `StudentRpgCatalogPanelProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/teacher-challenge-panel.tsx:18` | `TeacherChallengeGame`, `TeacherChallengePanelLabels`, `TeacherChallengePanelProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/use-student-challenge-run.ts:16` | `UseStudentChallengeRunOptions`, `UseStudentChallengeRunResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/react/use-student-rpg.ts:15` | `UseStudentRpgOptions`, `UseStudentRpgResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/responsive/index.ts:19` | `CameraTransform`, `LayoutPoint`, `LayoutProfile`, `LayoutRect`, `ResponsiveComposition`, `ResponsiveCompositionRequest`, `ResponsiveDebugOverlay`, `ResponsiveDiagnostic`, `ResponsiveInputMode`, `ResponsiveLayoutConfig`, `ResponsiveTransitionAdapter`, `ResponsiveTransitionCoordinator`, `ResponsiveTransitionReason`, `SafeAreaInsets`, `StandardRegionId`, `StandardRegionPlan`, `SupportedResponsiveComposition`, `TextFitRequest`, `TextFitResult`, `TextFitStyle`, `TextMeasurement`, `TextMeasurementAdapter`, `UnsupportedResponsiveComposition`, `WorldAdaptationStrategy` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/responsive/renderer.ts:13` | `Renderer`, `RendererInputs` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/responsive/responsive-composition.ts:34` | `StandardRegionId`, `CameraTransform`, `LayoutPoint`, `TextFitStyle`, `TextMeasurement`, `TextMeasurementAdapter`, `TextFitResult`, `TextFitRequest`, `ResponsiveDebugOverlay`, `ResponsiveTransitionReason`, `ResponsiveTransitionAdapter`, `ResponsiveTransitionCoordinator` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/runtime/actor-sprites.ts:27` | `ActorSpriteSceneLike`, `ActorSpritePlacement`, `ActorSpriteLayer` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/runtime/index.ts:10` | `ActorSpriteLayer`, `ActorSpriteLike`, `ActorSpritePlacement`, `ActorSpriteSceneLike`, `APKDiagnosticInput`, `APKDiagnosticEvent`, `APKGameHandle`, `APKGameInstance`, `APKHostAdapter`, `APKRuntimeDiagnostics`, `APKRuntimeStatus`, `APKSessionMode`, `AssetAnimation`, `AssetCollisionBox`, `AssetOrigin`, `AssetPackManifest`, `AssetProvenance`, `AssetView`, `AudienceTuning`, `CartridgeGameConfigContext`, `GameFactory`, `GameFactoryContext`, `FrameGrid`, `GameTerminalOutcome`, `GameInput`, `GameInputMode`, `MountCartridgeOptions`, `RuntimeCartridge`, `RuntimeCartridgeManifest`, `ResponsiveRuntimeOptions`, `NineSliceInsets`, `PhysicalAssetFile`, `PhysicalAssetKind`, `RuntimeEdition`, `SemanticAssetBinding`, `SemanticAssetUsage`, `APKInputController`, `APKInputSnapshot`, `APKPointerState`, `PhaserModuleLoader` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/runtime/input.ts:2` | `APKPointerState` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/runtime/phaser-factory.ts:39` | `PhaserModuleLoader` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/scaffolding/exemplar.ts:96` | `ExemplarCartridgeDefinition`, `ExemplarSimulationResult`, `ExemplarPublicApiSurface`, `ExemplarSimulationOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/scaffolding/index.ts:7` | `CartridgeManifest`, `CartridgeScaffold`, `ScaffoldFile`, `ScaffoldOptions`, `ExemplarCartridgeDefinition`, `ExemplarPublicApiSurface`, `ExemplarSimulationOptions`, `ExemplarSimulationResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/scaffolding/scaffold.ts:40` | `ScaffoldFile`, `CartridgeScaffold` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/bounded-frame-loop.ts:18` | `BoundedFrameTick` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/gameplay-primitives.ts:18` | `KinematicBody`, `ObjectPoolConfig`, `ObjectPool`, `DeterministicSpawnerConfig`, `DeterministicSpawner`, `ProjectileState`, `ProjectileStep` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/grid-navigation.ts:4` | `GridNavigatorConfig`, `GridNavigator` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/index.ts:10` | `AcceptedCapability`, `AcceptedCapabilityManifest`, `AcceptedT10Inputs`, `BlockedScopes`, `BoundedFrameScheduler`, `BoundedFrameTick`, `InputAction`, `InputActionEdge`, `InputActionId`, `InputActionNormalizerConfig`, `KeyboardActionMap`, `PhysicalInputDescriptor`, `PointerDragMap`, `PointerTapMap`, `LanguageTargetProgression`, `MatchResult`, `ProgressionSnapshot`, `TargetIdentityOptions`, `NonEmptyContent`, `NonEmptyContentItem`, `AccountedResult`, `ResultAccountant`, `ResultAccountingPolicy`, `ResultCounters`, `CompletionDelivery`, `CompletionLatch`, `TimeThresholdTick`, `TimeThresholdTimer`, `GridNavigator`, `GridNavigatorConfig`, `DeterministicSpawner`, `DeterministicSpawnerConfig`, `GameplayBounds`, `GameplayVector`, `KinematicBody`, `ObjectPool`, `ObjectPoolConfig`, `ProjectileState`, `ProjectileStep`, `MultiplayerSession`, `MultiplayerSessionOptions`, `MultiplayerSessionPhase`, `MultiplayerSessionRound`, `MultiplayerSessionState`, `MultiplayerTransport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/input-actions.ts:32` | `InputActionEdge`, `InputAction`, `KeyboardActionMap`, `PointerTapMap`, `PointerDragMap`, `InputActionNormalizerConfig`, `PhysicalInputDescriptor` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/language-target-progression.ts:15` | `TargetIdentityOptions`, `ProgressionSnapshot`, `MatchResult`, `LanguageTargetProgression` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/multiplayer-session.ts:26` | `MultiplayerSessionPhase`, `MultiplayerSessionRound` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/result-accounting.ts:29` | `ResultCounters`, `AccountedResult`, `ResultAccountant` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/single-completion.ts:14` | `CompletionDelivery` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit/src/systems/time-threshold.ts:27` | `TimeThresholdTimer` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/advantage-play-kit/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/advantage-play-kit-3d

Safe 13, needs check 430, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/advantage-play-kit-3d/src/avatar/compose.ts:22` | `strongestHairForm`, `hairTint`, `tintScales`, `nodeName`, `hairFormOf`, `positiveHalf` | safe | No module imports this export. |
| export | `packages/advantage-play-kit-3d/src/avatar/pack.ts:10` | `avatarPackPath` | safe | No module imports this export. |
| export | `packages/advantage-play-kit-3d/src/factory/mount.ts:272` | `guardOrientation` | safe | No module imports this export. |
| type | `packages/advantage-play-kit-3d/src/avatar/compose.ts:24` | `TintChannel`, `VariantSlot`, `EquipAttachRecord` | safe | No module imports this type. |
| type | `packages/advantage-play-kit-3d/src/device/tier.ts:7` | `TierHints`, `TierChoice` | safe | No module imports this type. |
| file | `packages/advantage-play-kit-3d/scripts/port-kit.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| export | `packages/advantage-play-kit-3d/src/audio/answer-choice.ts:2` | `ListeningAudioControllerError`, `createAnswerChoiceAudioController` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/audio/clip.ts:5` | `ClipPlayer` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/audio/index.ts:2` | `canSpeak`, `speak`, `stopSpeaking`, `ClipPlayer`, `ListeningAudioControllerError`, `createAnswerChoiceAudioController` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/audio/speech.ts:14` | `canSpeak`, `speak` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/avatar/launch.ts:44` | `CLASS_ROLES`, `ROLE_HEROES`, `roleHero`, `shownHero`, `readLaunchAvatar`, `starterLaunchAvatar` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/avatar/portrait-of.ts:18` | `APP_AVATAR_URL`, `PORTRAIT_FACE`, `avatarPortrait`, `portraitIcon`, `PORTRAIT_PPM`, `PORTRAIT_FEET`, `portraitFigure`, `playerFigure` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/avatar/portrait.ts:30` | `BASE_LAYERS`, `PORTRAIT_ORDER`, `hairLayer`, `overHairLayer` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/avatar/price.ts:16` | `SLOT_BASE`, `TIER_MULTIPLIER`, `TIER_LEVEL` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/apk.ts:18` | `vocabularyItemSchema`, `capabilityIdSchema`, `validateRuntimeCartridgeManifest` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/avatar.ts:7` | `avatarCatalogVersionSchema`, `avatarClassIdSchema`, `avatarClothSchema`, `avatarDyeSchema`, `avatarEyesSchema`, `avatarHairSchema`, `avatarLoadoutPieceSchema`, `avatarSkinSchema`, `avatarTintsSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/briefing.ts:18` | `gameBriefingTextSchema`, `gameBriefingInstructionSchema`, `gameBriefingLearningPreviewSchema`, `gameBriefingControlHintSchema`, `gameBriefingControlSchema`, `gameBriefingLabelsSchema`, `gameBriefingStartPhaseSchema`, `resolveGameBriefingStartPhase` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/evidence.ts:2` | `MAX_STORY_GAME_EVIDENCE_ITEMS`, `storyGameEvidenceItemSchema`, `storyItemKindSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/i18n.ts:33` | `I18N_MISSING_KEY_CODE` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/listening.ts:2` | `MAX_ANSWER_AUDIO_EVIDENCE_PAIRS`, `MAX_LISTENING_SESSION_ITEMS`, `getReadToSelectAudioCompletionCounts`, `readToSelectAudioSessionConfigSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/manifest.ts:33` | `storyNeedsSchema`, `challengeCapabilitySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/model-asset.ts:16` | `MODEL_PACK_TOOL`, `MODEL_PACK_TOOLS`, `modelProvenanceSchema`, `modelBindingSchema`, `packsByteSize` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/model-pack.ts:12` | `PACK_VERSIONS`, `MODEL_PACK_VERSION`, `MODEL_PACKS`, `VAULT_PACK`, `SPRITE_PACK_ID`, `spriteSheetId`, `spriteStillId`, `MODEL_PACK_IDS`, `GAME_LOADS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/results.ts:37` | `accuracyOf`, `countResponses`, `CLASS_BOSS_DAMAGE_PER_CORRECT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/sprite-asset.ts:44` | `SIDE_SCROLL_CHARACTER_GRID`, `WANG_TILE_GRID`, `ISOMETRIC_WANG_TILE_GRID`, `WANG_MASK_FRAMES`, `SIDE_SCROLL_CHARACTER_ANIMATIONS`, `SPRITE_PACK_ROOT_PREFIX`, `FORGE_DIRECTIONS_4` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/contracts/story-input.ts:3` | `CEFR_LEVELS`, `parsePracticeInput`, `practiceInputSchema`, `practiceSentenceSchema`, `practiceWordSchema`, `storyFillSchema`, `storyIndexSchema`, `storyParagraphSchema`, `storyQuestionSchema`, `storySentenceSchema`, `storySourceSchema`, `storyVocabularySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/device/gate.ts:79` | `browserEnvironment` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/device/tier.ts:30` | `PIXEL_RATIO_CAP` | needs check | Only tests use this symbol. |
| export | `packages/advantage-play-kit-3d/src/factory/index.ts:1` | `Apk3dError`, `detectRenderer`, `SESSION_OPTIONS_DEFAULT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/factory/renderer-setting.ts:11` | `detectRenderer` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/factory/three-factory.ts:13` | `Apk3dError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/factory/types.ts:143` | `SESSION_OPTIONS_DEFAULT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/host/index.ts:1` | `PACK_2D`, `inputIdOf`, `startStoryGame`, `previewItems` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/host/story-game.ts:56` | `PACK_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/host/story-game.ts:122` | `sessionOptionsOf` | needs check | Only tests use this symbol. |
| export | `packages/advantage-play-kit-3d/src/hud/board.ts:55` | `Board` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/hud/drag.ts:27` | `makeDraggable`, `hit` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/hud/index.ts:1` | `hasThai`, `hit`, `makeDraggable`, `attachJoystick`, `HudRoot`, `Board`, `arrange`, `Banner`, `Card`, `choose`, `feedback`, `markChoice`, `pips`, `sentenceBar`, `installCss` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/hud/joystick.ts:36` | `attachJoystick` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/hud/widgets.ts:79` | `choose`, `markChoice`, `arrange`, `feedback`, `sentenceBar`, `pips` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/react/index.ts:1` | `StoryGameHost` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/react/story-game-host.tsx:15` | `StoryGameHost` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/sim/arena.ts:34` | `isCircle`, `vec`, `length` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/sim/index.ts:20` | `SPREAD_GAP` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/sim/motion.ts:6` | `clamp`, `clamp01`, `inverseLerp`, `easeInQuad`, `easeInOutQuad`, `easeOutCubic`, `bounce` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/avatar.ts:53` | `bodyHeight`, `loadAvatarBody`, `neutralAvatarBody`, `playerBody` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/camera.ts:28` | `ShotRig`, `OrbitRig`, `FollowRig` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/fx.ts:9` | `projectile`, `burst` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/index.ts:1` | `Actor`, `bodyHeight`, `isAvatarBody`, `loadAvatarBody`, `neutralAvatarBody`, `playerBody`, `FollowRig`, `OrbitRig`, `ShotRig`, `burst`, `projectile`, `InstancedSet`, `disposeObject`, `ModelLoader`, `guessTier`, `QUALITY`, `smooth`, `Timeline`, `Walker` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/instanced.ts:20` | `InstancedSet` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/loader.ts:172` | `disposeObject` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/stage.ts:28` | `guessTier` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/stage/walker.ts:9` | `Walker` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/actor.ts:34` | `Actor2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/arena.ts:27` | `Arena2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/board2d.ts:40` | `Board2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/card2d.ts:53` | `Card2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/figure.ts:12` | `SPRITE_PPM`, `silhouetteCanvas`, `figureTexture` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/hud2d.ts:69` | `tag`, `recolorTag`, `popup`, `banner`, `button`, `StatusBar2D`, `WordPanel2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/index.ts:2` | `DIRECTION_NAMES_8`, `depthOf`, `directionRow`, `fitGameSize`, `project`, `animationKeyOf`, `registerSheetAnimations`, `sheetBinding`, `sheetBindings`, `textureKeyOf`, `Actor2D`, `Figure2D`, `figureTexture`, `silhouetteCanvas`, `SPRITE_PPM`, `banner`, `button`, `COLORS`, `FONT`, `popup`, `recolorTag`, `StatusBar2D`, `tag`, `text`, `WordPanel2D`, `Arena2D`, `Joystick2D`, `Card2D`, `Board2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/joystick.ts:27` | `Joystick2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/projection.ts:49` | `DIRECTION_NAMES_8`, `fitGameSize` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/advantage-play-kit-3d/src/view2d/sheets.ts:12` | `sheetBinding`, `registerSheetAnimations` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/audio/answer-choice.ts:5` | `AnswerChoiceAudioControllerOptions`, `AnswerChoiceAudioSnapshot`, `AnswerChoiceConfirmation`, `AnswerChoicePlaybackSnapshot`, `AudioClipPlaybackPort`, `AudioClipPreparationPort`, `AudioDuckingPort`, `ListeningAudioClipReference`, `ListeningAudioFailure`, `ListeningAudioFailureCode`, `ListeningAudioStatus` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/audio/bus.ts:9` | `Synth`, `SfxRecipe`, `Mood` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/audio/index.ts:1` | `Mood`, `SfxRecipe`, `Synth`, `AnswerChoiceAudioController`, `AnswerChoiceAudioControllerOptions`, `AnswerChoiceAudioSnapshot`, `AnswerChoiceConfirmation`, `AnswerChoicePlaybackSnapshot`, `AudioClipPlaybackPort`, `AudioClipPreparationPort`, `AudioDuckingPort`, `ListeningAudioClipReference`, `ListeningAudioFailure`, `ListeningAudioFailureCode`, `ListeningAudioStatus` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/launch.ts:41` | `AvatarRole` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/portrait-of.ts:91` | `PortraitFigure` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/portrait.ts:78` | `PortraitLoadout` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/price.ts:11` | `AvatarSlot`, `PriceInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/starters.ts:8` | `StarterSet` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/avatar/tint.ts:5` | `TintChannel` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/apk.ts:43` | `VocabularyItem`, `RuntimeCartridgeManifest`, `SafeAreaInsets`, `StandardRegionId`, `RuntimeCartridge`, `GameFactoryContext`, `GameFactory` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/avatar.ts:18` | `AvatarLoadoutPiece`, `AvatarTints` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/briefing.ts:27` | `GameBriefingInstruction`, `GameBriefingLearningPreview`, `GameBriefingControlHint`, `GameBriefingControl`, `GameBriefingLabels`, `GameBriefingStartPhase` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/evidence.ts:3` | `StoryItemKind` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/listening.ts:3` | `ReadToSelectAudioCompletionCounts`, `ReadToSelectAudioSessionConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/manifest.ts:59` | `ChallengeCapability` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/model-asset.ts:67` | `ModelProvenance`, `ModelBinding` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/model-pack.ts:72` | `GameModelLoad` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/results.ts:77` | `StoryGameOutcome`, `Stars` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/sprite-asset.ts:249` | `PhysicalAssetLoader`, `PhysicalAnimationManager`, `ResolvedAssetBinding`, `ForgeDirection` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/story-compat.ts:88` | `LegacyStoryPack` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/contracts/story-input.ts:27` | `CefrLevel`, `PracticeSentence`, `PracticeWord`, `StoryFill`, `StoryIndexEntry`, `StoryParagraph`, `StoryQuestion`, `StorySentence`, `StoryVocabulary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/device/gate.ts:40` | `CheckDeviceOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/index.ts:1` | `ThreeFactoryOptions`, `PhaserModuleLike`, `PhaserModuleLoader`, `RendererChoice`, `Renderer`, `RendererInputs`, `CartridgeMounterFactories`, `ThreeGameFactory`, `Game2DContext`, `Game3DContext`, `GateVerdict`, `HostServices`, `PhaserCartridge`, `PhaserFactoryContext`, `PhaserGameFactory`, `SessionOptions`, `StandaloneComposition`, `ThreeCartridge`, `ThreeFactoryContext` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/mount.ts:30` | `ThreeGameFactory`, `CartridgeMounterFactories` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/phaser-factory.ts:42` | `PhaserModuleLike`, `PhaserModuleLoader` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/renderer-setting.ts:15` | `Renderer`, `RendererInputs` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/select.ts:23` | `RendererChoice` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/factory/three-factory.ts:24` | `ThreeFactoryOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/host/index.ts:1` | `StoryGameOptions`, `StoryGamePhase`, `StoryGameSession` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/host/results.ts:8` | `Run` | needs check | Only tests use this symbol. |
| type | `packages/advantage-play-kit-3d/src/host/story-game.ts:108` | `StoryGameSession` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/board.ts:10` | `BoardCell`, `Cell` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/drag.ts:11` | `DragHandlers` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/index.ts:1` | `ScreenPoint`, `DragHandlers`, `Joystick`, `JoystickOptions`, `PopKind`, `BoardCell`, `Cell`, `ArrangeLabels`, `ChoiceOption`, `FeedbackAction` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/joystick.ts:11` | `JoystickOptions`, `Joystick` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/root.ts:17` | `PopKind` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/hud/widgets.ts:70` | `ChoiceOption`, `ArrangeLabels`, `FeedbackAction` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/i18n/catalog.ts:10` | `I18nOptions`, `I18n` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/i18n/scan.ts:18` | `KeyUse`, `KeyScan`, `LiteralTextAssignment` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/react/index.ts:1` | `StoryGameHostProps`, `StoryGamePhase` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/react/story-game-host.tsx:9` | `StoryGameHostProps` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/sim/arena.ts:9` | `Vec2`, `Mover`, `Bounds`, `SpreadOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/sim/index.ts:2` | `Rng`, `SimulationView`, `ManualClock`, `FixedStepLoop`, `Recorder`, `RecordedCommand` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/sim/simulation.ts:37` | `SimulationView`, `FixedStepLoop`, `ManualClock`, `RecordedCommand`, `Recorder` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/actor.ts:12` | `ActorOptions`, `ClipRun` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/avatar.ts:19` | `DroppedPiece` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/camera.ts:9` | `V3`, `Shot` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/index.ts:1` | `ActorOptions`, `ClipRun`, `ActorBody`, `AvatarBody`, `DroppedPiece`, `CameraPose`, `CameraRig`, `Shot`, `V3`, `CutBox`, `Placement`, `GLTF`, `QualityTier`, `QualityTierId`, `ScreenRegion`, `StageOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/instanced.ts:9` | `Placement`, `CutBox` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/stage/stage.ts:14` | `QualityTier`, `ScreenRegion`, `StageOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/actor.ts:21` | `Actor2DOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/arena.ts:16` | `Arena2DOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/board2d.ts:15` | `BoardCell`, `Cell` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/card2d.ts:21` | `CardOption`, `CardAction`, `ArrangeLabels`, `CardTarget` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/index.ts:2` | `Point2D`, `Projection2D`, `SemanticBinding`, `Actor2DOptions`, `FigureSource`, `Arena2DOptions`, `Joystick2DOptions`, `ArrangeLabels`, `CardAction`, `CardOption`, `CardTarget`, `Rect`, `BoardCell`, `Cell` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/joystick.ts:11` | `Joystick2DOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/advantage-play-kit-3d/src/view2d/sheets.ts:9` | `SemanticBinding` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/advantage-play-kit-3d/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/ai

Safe 11, needs check 39, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/ai/src/__tests__/diagram.fixture.ts:33` | `diagramBase64` | safe | No module imports this export. |
| export | `packages/ai/src/providers/mock.ts:193` | `defaultMockResponses` | safe | No module imports this export. |
| type | `packages/ai/src/__tests__/contract-suite.ts:56` | `AIClientFactory` | safe | No module imports this type. |
| type | `packages/ai/src/__tests__/recommendations.fixture.ts:49` | `RecommendationFixture` | safe | No module imports this type. |
| type | `packages/ai/src/providers/google.ts:30` | `GoogleProviderConfig` | safe | No module imports this type. |
| type | `packages/ai/src/providers/openai.ts:24` | `OpenAIProviderConfig` | safe | No module imports this type. |
| type | `packages/ai/src/providers/openrouter.ts:62` | `OpenRouterProviderConfig` | safe | No module imports this type. |
| type | `packages/ai/src/providers/vertex.ts:7` | `VertexProviderConfig` | safe | No module imports this type. |
| type | `packages/ai/src/testing/provider-guard-utility.ts:207` | `GuardHit`, `GuardHitKind`, `ProviderGuard` | safe | No module imports this type. |
| export | `packages/ai/src/index.ts:24` | `UnsupportedError`, `createTestClient`, `OpenRouterProvider`, `stripOpenRouterPrefix` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/ai/src/internal-sdk.ts:28` | `createOpenAI`, `createGoogleGenerativeAI`, `createVertex`, `generateObject`, `generateText`, `streamText`, `experimental_generateImage` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/ai/src/providers/openrouter.ts:78` | `stripOpenRouterPrefix` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/ai/src/voice/openai.ts:41` | `SUMMARY_TOOL`, `realtimeSessionConfig` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/ai/src/voice/usage.ts:71` | `RATE_CARD_VERSION` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/ai/src/index.ts:2` | `AIClient`, `AIClientWithProvenance`, `AIProvider`, `AIGenerationProvenance`, `AIGenerationUsage`, `GenerateObjectInput`, `GenerateObjectWithProvenanceResult`, `GenerateObjectFromMediaInput`, `MediaInput`, `GenerateImageInput`, `GenerateTextInput`, `StreamTextInput`, `StreamTextResult`, `TranscribeAudioInput`, `TranscribeAudioResult`, `AIConfig`, `MockResponses` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/ai/src/voice/openai.ts:14` | `SidebandSocket`, `SidebandSocketCtor`, `OpenAIVoiceConfig`, `OpenAIVoiceCallRequest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/ai/src/voice/safety.ts:3` | `VoiceSafetyReason`, `VoiceSafetyDecision` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/ai/src/voice/usage.ts:4` | `RealtimeUsage` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/ai/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/api

Safe 5, needs check 52, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/api/src/routes/auth/reset-password.ts:15` | `resetPasswordSchema` | safe | No module imports this export. |
| type | `packages/api/src/cache/dashboard-cache.ts:25` | `DashboardCacheKeyInput`, `DashboardCacheOptions` | safe | No module imports this type. |
| type | `packages/api/src/testing/api-contract-kit.ts:156` | `ApiContractKit`, `EnvelopeCase` | safe | No module imports this type. |
| export | `packages/api/src/cache/dashboard-cache.ts:41` | `buildDashboardCacheKey`, `clearDashboardCache` | needs check | Only tests use this symbol. |
| export | `packages/api/src/context.ts:55` | `getAuthToken` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/index.ts:1` | `appRouter`, `createContext`, `publicProcedure`, `protectedProcedure`, `adminProcedure`, `router` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/root.ts:17` | `appRouter` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/activity/index.ts:42` | `handleActivityHttpRequest` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/apk-challenges/index.ts:41` | `createApkChallengeClassesRoute`, `createApkChallengeTeacherClassesRoute`, `createApkChallengeRoute`, `createApkChallengeRunRoute` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/auth/index.ts:1` | `handleLogin`, `createLoginHandler`, `PASSWORD_CHANGE_REQUIRED`, `createTemporaryPasswordChangeHandler`, `temporaryPasswordChangeSchema`, `temporaryPasswordChangeResponseSchema`, `handleSession`, `handleLogout`, `handleImpersonate`, `handleRegister`, `handleResetPassword`, `createResetPasswordHandler`, `enrichAuthUser`, `getClientIp` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/auth/logout.ts:12` | `handleLogout` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/auth/session.ts:14` | `handleSession` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/routes/auth/temporary-password.ts:25` | `temporaryPasswordChangeSchema`, `temporaryPasswordChangeResponseSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/sales-root.ts:5` | `salesAppRouter` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/api/src/trpc.ts:74` | `publicProcedure` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/codecamp-root.ts:18` | `CodecampAppRouter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/context.ts:26` | `LegacyContextOptions`, `VerifiedPrincipalContextOptions`, `CreateContextOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/index.ts:1` | `AppRouter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/root.ts:31` | `AppRouter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/routes/activity/index.ts:5` | `ActivityHttpHandlers`, `ActivityHttpRequest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/routes/apk-challenges/index.ts:24` | `ApkChallengeRouteDependencies`, `ApkChallengeRequest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/routes/auth/index.ts:1` | `LoginHandlerOptions`, `ResetPasswordHandlerOptions`, `ResetPrincipal` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/routes/auth/login.ts:61` | `LoginHandlerOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/routes/auth/reset-password.ts:21` | `ResetPrincipal`, `ResetPasswordHandlerOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/api/src/sales-root.ts:8` | `SalesAppRouter` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/api/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/architecture-enforcement

Safe 0, needs check 40, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/architecture-enforcement/src/architecture-reconciliation.ts:71` | `ARCHITECTURE_OWNERSHIP_MAP_PATH` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/architecture-enforcement/src/contracts.ts:11` | `architectureDomainSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/architecture-enforcement/src/counterexample-fixtures.ts:25` | `architectureCounterexampleSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/architecture-enforcement/src/inventory.ts:52` | `architectureInventorySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/architecture-enforcement/src/v2-manifest-validation.ts:837` | `computeAnalyzerInputSnapshotSha256Sync` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/architecture-reconciliation.ts:206` | `PreviewArchitectureReconciliationOptions`, `ApplyArchitectureReconciliationOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/baseline-update.ts:34` | `NewDebtReviewMetadata`, `CreateUpdatedArchitectureBaselinesOptions`, `ArchitectureBaselineUpdateResult`, `UpdateArchitectureBaselinesOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/baseline-validation.ts:48` | `BaselineValidationSummary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/contracts.ts:473` | `OwnershipRoot` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/counterexample-fixtures.ts:84` | `ArchitectureCounterexample`, `CounterexampleParseError`, `CounterexampleSourceValidation` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/finding-identity.ts:6` | `ArchitectureFindingIdentityInput`, `ArchitectureFindingIdentity` | needs check | Open track changes this package. |
| type | `packages/architecture-enforcement/src/inventory.ts:80` | `InventoryFact`, `InventoryParseError`, `ArchitectureInventory`, `InventoryRepositoryOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/ownership-map.ts:83` | `OwnershipReasonCode`, `AllowedOwnershipDecision`, `ViolatingOwnershipDecision`, `OwnershipDecision` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/policy-selection.ts:21` | `ArchitecturePolicySelection`, `SelectArchitecturePolicyOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/policy-update-transaction.ts:90` | `PreviewRepositoryFileTransactionOptions`, `RepositoryTransactionArtifactError` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/policy-write-guard.ts:10` | `PolicyAwareWriteInput`, `PolicyAwareWriteResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/reconciliation-manifest-builder.ts:206` | `BuiltAnalyzerReconciliationManifest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/repository-transaction-recovery-cli.ts:16` | `RepositoryTransactionRecoveryCliOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/v1-validation.ts:7` | `V1ArtifactBinding`, `V1ArtifactValidationResult`, `ValidateV1ArtifactFamilyInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/architecture-enforcement/src/v2-manifest-validation.ts:42` | `ValidateAnalyzerReconciliationManifestV2Input`, `AnalyzerReconciliationManifestV2ValidationResult`, `V2EvidenceSourceProjection` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/architecture-enforcement/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/auth

Safe 2, needs check 118, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/auth/src/audit-retention-job.ts:35` | `tryAcquireAdvisoryLock`, `releaseAdvisoryLock` | safe | No module imports this export. |
| export | `packages/auth/src/company-identity/environment.ts:273` | `companyIdentitySecurityEnvSchema`, `companyIdentityIssuerEnvSchema`, `companyIdentityCookieEnvSchema`, `companyIdentityPublicClientEnvSchema`, `createCompanyIdentitySecurityConfig`, `createCompanyIdentityIssuerConfig`, `createCompanyIdentityCookieConfig`, `createCompanyIdentityServiceAuthConfig`, `createCompanyIdentityPublicClientConfig` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/company-identity/index.ts:7` | `ARGON2ID_OPTS`, `hashPassword`, `rehashOnLogin`, `verifyPassword` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/index.ts:3` | `ROLES`, `roleAtLeast`, `ROLE_HIERARCHY`, `ROLE_ROUTES`, `PERMISSIONS`, `hasPermission`, `registerDomainModulePermissions`, `lookupPermission`, `assertTenantAccess`, `productAuthorizationScopeSchema`, `assertCan`, `AuthError`, `recordAuditEvent`, `AuditEventError`, `verifyPassword`, `rehashOnLogin`, `adoptLegacyPassword`, `ARGON2ID_OPTS`, `passwordSchema`, `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`, `CredentialUsernameConflictError`, `createSession`, `validateSession`, `deleteSession`, `revokeAllUserSessions`, `STUDENT_SESSION_IDLE_SECONDS`, `SCHOOL_DAY_END_HOUR`, `schoolDayEnd`, `studentSessionOptions`, `checkRateLimit`, `checkRateLimitByIp`, `consumeRateLimit`, `recordFailure`, `resetLimit`, `configureRateLimiter`, `configurePostgresRateLimiter`, `createInMemoryRateLimitStore`, `getRateLimitConfig`, `getIpRateLimitConfig`, `DEFAULT_RATE_LIMIT_CONFIG`, `DEFAULT_IP_RATE_LIMIT_CONFIG`, `CAPTCHA_THRESHOLD`, `_testkit`, `createPostgresRateLimitStore`, `cleanupOldAttempts`, `createRateLimitCleanupJob`, `runCleanupWithLock`, `RATE_LIMIT_CLEANUP_LOCK_KEY`, `getSession`, `requireAuth`, `requireRole`, `hasRole`, `SESSION_COOKIE_NAME`, `retentionConfigSchema`, `getRetentionDays`, `purgeExpiredAuditEvents`, `getRetentionCutoff`, `createAuditRetentionJob`, `runPurgeWithLock`, `AUDIT_RETENTION_LOCK_KEY` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/permissions.ts:25` | `registerDomainModulePermissions`, `lookupPermission` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/rate-limit.ts:107` | `DEFAULT_IP_RATE_LIMIT_CONFIG`, `consumeRateLimit`, `getRateLimitConfig`, `getIpRateLimitConfig` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/server.ts:76` | `SESSION_COOKIE_NAME` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/auth/src/student-session-policy.ts:5` | `SCHOOL_DAY_END_HOUR` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/audit.ts:6` | `AuditContext`, `AuditPayload` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/company-identity/client.ts:103` | `CompanyOidcIdentity`, `CompanyOidcTransaction`, `CompanyOidcSession`, `CompanyOidcClient` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/company-identity/environment.ts:290` | `CompanyIdentitySecurityConfig`, `CompanyIdentityIssuerConfig`, `CompanyIdentityCookieConfig`, `CompanyIdentityPublicClientConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/credential-account.ts:19` | `CreateCredentialAccountInput`, `CreatedCredentialAccount` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/index.ts:4` | `Role`, `Permission`, `DomainModulePermissions`, `Tenant`, `UserContext`, `AuthContext`, `ProductAuthorizationScope`, `AuditContext`, `AuditPayload`, `CreateCredentialAccountInput`, `CreatedCredentialAccount`, `Session`, `SessionAuthStrength`, `CreateSessionResult`, `StudentSessionOptions`, `RateLimitConfig`, `RateLimitCheckResult`, `RateLimitStore`, `RateLimitStoreEntry` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/permissions.ts:8` | `DomainModulePermissions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/rate-limit.ts:85` | `RateLimitCheckResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/session.ts:38` | `CreateSessionResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/student-session-policy.ts:13` | `StudentSessionOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/auth/src/tenant.ts:21` | `AuthContext` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/auth/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/auth-client

Safe 0, needs check 4, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| type | `packages/auth-client/src/index.ts:43` | `AuthUser`, `AuthState`, `AuthActions`, `AuthContextValue` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/auth-client/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/avatar-kit

Safe 0, needs check 12, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/avatar-kit/src/loadout.ts:12` | `DEFAULT_HAIR`, `TIER_LEVELS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/avatar-kit/src/portrait.ts:21` | `PORTRAIT_SIZE`, `PORTRAIT_CAMERA`, `BASE_LAYERS`, `PORTRAIT_ORDER`, `hairLayer`, `overHairLayer`, `portraitPixels` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/avatar-kit/src/catalog.ts:16` | `AvatarCatalogItem` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/avatar-kit/src/loadout.ts:9` | `TintSlot` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/avatar-kit/src/tint.ts:6` | `TintChannel` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/avatar-kit/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/backend

Safe 4, needs check 165, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/backend/src/modules/company-identity/__tests__/postgres-task3-test-support.ts:18` | `assertDisposableCompanyIdentityDatabase` | safe | No module imports this export. |
| export | `packages/backend/src/modules/company-identity/route-bindings.ts:228` | `companyIdentityRouteInventory`, `companyIdentityRouteBindingFor` | safe | No module imports this export. |
| type | `packages/backend/src/kernel/durable-value.ts:28` | `DurableValueEnvelope` | safe | No module imports this type. |
| export | `packages/backend/src/jobs/contracts.ts:24` | `jobLeaseTokenSchema`, `jobLeaseSchema`, `jobEnvelopeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/catalog.ts:22` | `catalogIdempotencyPolicySchema`, `legacyRouteCatalogEntrySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/errors.ts:10` | `errorCodeSchema`, `jobErrorOutcomeSchema`, `errorTransportMappingSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/index.ts:17` | `capabilityRequestContextSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/policies.ts:49` | `resourceReferenceShape`, `transactionIsolationSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/primitives.ts:44` | `jsonValueSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/kernel/contracts/route-bindings.ts:7` | `routeExposureSchema`, `honoHttpRouteBindingSchema`, `trpcRouteBindingSchema`, `cliRouteBindingSchema`, `bindingTransportSchema`, `bindingCapabilityKindSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/accounting/contracts.ts:53` | `accountingSubmissionEvidenceReferenceSchema`, `accountingSubmissionKindSchema`, `accountingSubmissionStatusSchema`, `accountingSubmissionActionSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/accounting/submissions.ts:356` | `approveAccountingSubmission`, `rejectAccountingSubmission` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/capabilities.ts:220` | `listEmployeesCapability`, `createEmployeeCapability`, `setEmployeeStatusCapability`, `setApplicationRolesCapability`, `setCompanyRolesCapability`, `resetCredentialCapability`, `revokeSessionsCapability` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/codecamp-migration.ts:15` | `codecampMigrationRoleSchema`, `codecampMigrationPasswordAlgorithmSchema`, `normalizeCodecampMigrationUsername` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/contracts.ts:4` | `companyRoleSchema`, `employeeStatusSchema`, `appRoleKeySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/dev-local-product-access.ts:55` | `DEV_LOCAL_ADMIN_ROLE_BY_APPLICATION`, `devLocalApplicationRecordSchema`, `devLocalHeldAssignmentSchema`, `devLocalGrantStatusSchema`, `devLocalGrantPlanEntrySchema`, `devLocalEnsureStatusSchema`, `devLocalEnsureStepSchema`, `deriveDevLocalWorkbooksApplicationId`, `resolveAdminRoleKeyForApplication` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/finance-thb-policy-approval.ts:135` | `FinanceThbPolicyApprovalError`, `createFinanceThbPolicyApprovalAttestor` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/postgres-codecamp-migration.ts:678` | `runPostgresCodecampIdentityMigration` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/postgres-dev-local-product-access.ts:71` | `validateDevLocalProductAccessInput`, `runPostgresDevLocalProductAccess` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/postgres-rate-limit.ts:16` | `createPostgresCompanyLoginRateLimit` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/public-route-adapter.ts:21` | `createCompanyIdentityRouteAdapter` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/company-identity/service.ts:149` | `assertCompanyIdentityAtomicRepository` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/finance-operations/index.ts:3` | `financeMoneyInputSchema`, `financeOperationScopeSchema`, `privateEvidenceReferenceSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/planned-game-intake/contracts.ts:139` | `plannedGameIntakeAuthoritySchema`, `plannedGameOwnerEvidenceSchema`, `plannedGameIndependentReviewSchema`, `plannedGameIntakeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/standard-pack-ingestion/admission-contracts.ts:103` | `standardPackSuccessorAdmissionReceiptOutcomeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/backend/src/modules/standard-pack-ingestion/contracts.ts:19` | `standardPackImmutableGitCandidateSchema`, `standardPackSuccessorRegistryAuthorizationSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/jobs/contracts.ts:60` | `SafeJobError`, `JobLease`, `JsonSafeValue`, `JobEnvelope` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/jobs/dead-letter-contracts.ts:35` | `DeadJobSummary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/catalog.ts:34` | `CatalogIdempotencyPolicy`, `CapabilityCatalogEntry`, `LegacyRouteCatalogEntry`, `CapabilityCatalog`, `RouteManifest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/context.ts:102` | `TenantLookupReference` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/descriptors.ts:37` | `CapabilityKind`, `CapabilityDescriptorBase` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/errors.ts:13` | `ErrorCode`, `JobErrorOutcome` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/invalid-combinations.ts:13` | `InvalidCombinationRule` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/policies.ts:88` | `TransactionIsolation` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/primitives.ts:4` | `JsonScalar`, `JsonValue` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/projections.ts:301` | `AllowedProjectionContractInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/registry.ts:23` | `CapabilityRegistryEntry` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/contracts/route-bindings.ts:15` | `RouteExposure`, `HttpMethod`, `BindingTransport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/kernel/runtime.ts:68` | `AuthorizationPolicyDefinition`, `GlobalTenancyPolicyDefinition`, `TenantResolverDefinition` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/accounting/contracts.ts:61` | `AccountingSubmissionKind`, `AccountingSubmissionStatus`, `AccountingSubmissionAction` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/accounting/submissions.ts:101` | `AccountingSubmissionErrorReason` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/codecamp-migration.ts:132` | `PlanCodecampMigrationInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/dev-local-product-access.ts:126` | `DevLocalApplicationRecord`, `DevLocalHeldAssignment`, `DevLocalGrantPlanEntry`, `DevLocalEnsureStep`, `AdminRoleResolution`, `PlanDevLocalProductAccessInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/errors.ts:2` | `CompanyIdentityErrorCode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/finance-attestation.ts:6` | `FinanceAttestationCredential`, `FinanceAttestationScope`, `FinanceAuthenticatedOwnerClaims`, `CompanyIdentityFinanceAuthenticator`, `FinanceRolePolicy`, `FinanceAttestationAuditContext`, `FinanceAttestationAuditActor`, `FinanceAttestationAuditReason`, `FinanceAttestationAuditEvent`, `FinanceAttestationAuditPort`, `FinanceAttestationTrustedAuditSources`, `CompanyIdentityFinanceAuditRepository`, `FinanceAttestationDecision`, `FinanceCompanyIdentityAttestor` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/finance-thb-policy-approval.ts:130` | `FinanceThbPolicyApprovalErrorCode`, `FinanceThbPolicyApprovalScope`, `FinanceThbPolicyApprovalReceipt`, `FinanceThbPolicyApprovalAuthorityInput`, `FinanceThbPolicyApprovalAuthorityResult`, `FinanceThbPolicyApprovalAuthorityPort`, `FinanceThbPolicyApprovalReceiptLookup`, `FinanceThbPolicyApprovalReceiptLedgerPort`, `FinanceThbPolicyApprovalAuditActor`, `FinanceThbPolicyApprovalAuditEvent`, `FinanceThbPolicyApprovalAuditPort`, `FinanceThbPolicyApprovalTrustedAuditSources`, `FinanceThbPolicyApprovalFactoryInput`, `FinanceThbPolicyApprovalVerificationInput`, `FinanceThbPolicyApprovalDenyReason`, `FinanceThbPolicyApprovalVerificationResult`, `FinanceThbPolicyApprovalAttestor` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/index.ts:12` | `ApplicationSessionRevocation`, `AuthorizationCodeInsert`, `AuthorizationCodeRecord`, `CompanyIdentityRepository`, `EmployeeCredentialRecord`, `IdentityAuditInput`, `IdentityAuditMutation`, `OidcClientRecord`, `SsoSessionInsert`, `SsoSessionRecord` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/internal-route-adapter.ts:16` | `CompanyIdentityRouteOperations`, `CompanyIdentityRouteAdapter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/postgres-codecamp-migration.ts:53` | `PostgresCodecampMigrationInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/public-route-adapter.ts:9` | `PublicCompanyIdentityRouteAdapter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/company-identity/service.ts:41` | `CompanyPasswordPort`, `CompanyIdentityServiceConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/finance-operations/index.ts:6` | `FinanceMoneyInput`, `FinanceOperationScope` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/planned-game-intake/contracts.ts:156` | `PlannedGameIntakeAuthority`, `PlannedGameOwnerEvidence`, `PlannedGameIndependentReview`, `PlannedGameIntake`, `PlannedGameIntakeValidationRequest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/standard-pack-ingestion/admission-contracts.ts:109` | `StandardPackSuccessorAdmissionReceiptOutcome` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/standard-pack-ingestion/admission-errors.ts:2` | `StandardPackSuccessorAdmissionErrorCode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/standard-pack-ingestion/admission-port.ts:17` | `StandardPackSuccessorAdmissionAuthorizationDecision` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/standard-pack-ingestion/contracts.ts:26` | `StandardPackImmutableGitCandidate`, `StandardPackSuccessorRegistryAuthorization` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/backend/src/modules/standard-pack-ingestion/ledger-successor-admission-facade.ts:31` | `StandardPackIngestionLedgerPredecessorLookupBoundary`, `StandardPackIngestionLedgerSuccessorRegistryBoundary`, `StandardPackIngestionLedgerSuccessorAdmissionFacadeDependencies` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/backend/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/codecamp-knowledge

Safe 0, needs check 89, false positive 1, unreachable modules 1.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `packages/codecamp-knowledge/source-snapshots/` | | needs check | Every code file in this directory is unused. |
| file | `packages/codecamp-knowledge/fixtures/apk-reference/cartridge.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `packages/codecamp-knowledge/source-snapshots/codecamp-curriculum-5d302b127606c4a4.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| file | `packages/codecamp-knowledge/source-snapshots/codecamp-curriculum-e4d3fc7cc9927f91.ts:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| export | `packages/codecamp-knowledge/src/apk-blueprint.ts:17` | `APKWorkedExampleSchema`, `APKGuidedPracticeSchema`, `APKIndependentPracticeSchema`, `APKObjectiveBlueprintSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/apk-unit.ts:48` | `codecampAPKReference`, `createCodecampAPKIndependentActivity` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/bindings.ts:10` | `CurriculumActivitySourceSchema`, `CurriculumActivityBindingSchema`, `CurriculumModuleSummarySchema`, `CurriculumRubricBindingSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/cli.ts:38` | `defaultCodecampMonorepoRoot` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/contracts.ts:8` | `CodeClusterSchema`, `CodeObjectiveTypeSchema`, `CodeEdgeMetadataSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/index.ts:2` | `CodeClusterSchema`, `CodeEdgeMetadataSchema`, `CodeNodeMetadataSchema`, `CodeObjectiveTypeSchema`, `asCodeKnowledgeGraph`, `CodeGraphSourceProvenanceSchema`, `defaultCodecampMonorepoRoot`, `CurriculumActivityBindingSchema`, `CurriculumActivitySourceSchema`, `CurriculumModuleSummarySchema`, `CurriculumRubricBindingSchema`, `CurriculumSourceInventorySchema`, `CurriculumSourceProvenanceSchema`, `APKGuidedPracticeSchema`, `APKIndependentPracticeSchema`, `APKObjectiveBlueprintSchema`, `APKWorkedExampleSchema`, `CodecampAPKUnitSchema`, `codecampAPKReference`, `codecampAPKUnit`, `createCodecampAPKActivity`, `createCodecampAPKIndependentActivity`, `createCodecampAPKTutorialActivity` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/tutorial-offline.ts:2` | `createStorageTutorialReportQueue`, `enqueueTutorialReport`, `flushTutorialReportQueue` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/codecamp-knowledge/src/validation.ts:216` | `asCodeKnowledgeGraph` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/apk-blueprint.ts:118` | `APKLearningBlueprint`, `APKBlueprintIssue`, `APKBlueprintValidationResult`, `APKBlueprintReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/apk-unit.ts:43` | `CodecampAPKUnit` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/bindings.ts:106` | `CurriculumBindingRelease`, `ValidatedCurriculumBindingRelease`, `CurriculumBindingIssue`, `CurriculumBindingValidationResult`, `BoundMasteryEvidence`, `BindingCoverageReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/cli.ts:20` | `CodeGraphCliContext` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/curriculum-inventory-contract.ts:5` | `InventoryLessonInput`, `InventoryModuleInput`, `CurriculumInventoryInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/index.ts:10` | `CodeKnowledgeGraph`, `CodeGraphIssue`, `CodeGraphValidationResult`, `CodeGraphDiff`, `CodeGraphReport`, `CodeGraphSourceProvenance`, `SourceSyncResult`, `CodeGraphCliContext`, `BindingCoverageReport`, `BoundMasteryEvidence`, `CurriculumBindingIssue`, `CurriculumBindingRelease`, `CurriculumBindingValidationResult`, `ValidatedCurriculumBindingRelease`, `CurriculumInventoryInput`, `CurriculumSourceInventory`, `CurriculumSourceProvenance`, `InventoryLessonInput`, `InventoryModuleInput`, `APKBlueprintIssue`, `APKBlueprintReport`, `APKBlueprintValidationResult`, `APKLearningBlueprint`, `CodecampAPKUnit` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/report.ts:5` | `CodeGraphReport`, `CodeGraphDiff` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/source-sync.ts:18` | `CodeGraphSourceProvenance`, `SourceSyncResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/codecamp-knowledge/src/tutorial-offline.ts:3` | `QueuedTutorialReport`, `TutorialReportQueue` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/codecamp-knowledge/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/config

Safe 0, needs check 1, false positive 0, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/config/eslint/index.js:87` | `default` | needs check | Package entry export with no consumer in the workspace. |

### packages/db

Safe 29, needs check 132, false positive 3, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/db/src/accounting/index.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `packages/db/src/accounting/environment.ts:107` | `accountingRuntimeEnvSchema`, `accountingDirectEnvSchema` | safe | No module imports this export. |
| export | `packages/db/src/migrations-data/primary-legacy-import.ts:28` | `jsonb` | safe | No module imports this export. |
| export | `packages/db/src/seed/codecamp-backfill-exercises.ts:136` | `backfillExerciseLessons` | safe | No module imports this export. |
| type | `packages/db/src/__tests__/fixtures/durable-job-transition-counterexamples.ts:2` | `DurableJobDesignFinding`, `DurableJobInvalidRowFixture`, `DurableJobTransitionScenarioFixture` | safe | No module imports this type. |
| type | `packages/db/src/accounting/doctor.ts:21` | `AccountingDoctorIssue`, `AccountingDoctorReport` | safe | No module imports this type. |
| type | `packages/db/src/accounting/environment.ts:132` | `AccountingRuntimeConfig`, `AccountingDirectConfig` | safe | No module imports this type. |
| type | `packages/db/src/legacy-db-guard.ts:2` | `ReadOnlyQuery` | safe | No module imports this type. |
| type | `packages/db/src/migration-files.ts:19` | `PostgresMigrationFile` | safe | No module imports this type. |
| type | `packages/db/src/migration.ts:22` | `ProductMigrationOptions` | safe | No module imports this type. |
| type | `packages/db/src/migrations-data/primary-legacy-import.ts:86` | `TableReport`, `ImportReport`, `ImportOptions` | safe | No module imports this type. |
| type | `packages/db/src/seed/codecamp-curriculum-data.ts:13` | `CurriculumTheorySection` | safe | No module imports this type. |
| type | `packages/db/src/sentinel-evaluation.ts:4` | `SentinelSqlClient` | safe | No module imports this type. |
| type | `packages/db/src/testing/migration-doctor-helper.ts:223` | `Divergence`, `DivergenceReport`, `FakeLedgerRow`, `JournalEntry`, `MigrationDoctorHelper`, `MigrationState`, `SentinelProbe`, `StateVariant` | safe | No module imports this type. |
| type | `packages/db/src/tutor-read-queries.ts:13` | `TutorReadQuery` | safe | No module imports this type. |
| file | `packages/db/src/accounting/doctor.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/accounting/environment.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/accounting/migration.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/legacy-db-guard.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/migration-files.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/migration.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/migrations-data/primary-legacy-import.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/seed/codecamp-apk-curriculum-data.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/seed/codecamp-backfill-exercises.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/seed/codecamp-users-seed.ts:1` |  | needs check | String path reference in packages/db/tsconfig.json (+1). |
| file | `packages/db/src/sentinel-evaluation.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/sentinels.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/tutor-read-compare.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/db/src/tutor-read-queries.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/db/src/accounting/client.ts:147` | `createAccountingDirectClient` | needs check | Only tests use this symbol. |
| export | `packages/db/src/company-identity/contracts/index.ts:129` | `companyAccountIdSchema`, `companyUsernameInputSchema`, `normalizedCompanyUsernameSchema`, `companyUsernameNormalizationVersionSchema`, `companyAccountStatusSchema`, `passwordHashAlgorithmSchema`, `organizationStableKeySchema`, `companyOrganizationTypeSchema`, `applicationStableKeySchema`, `companyRoleKeySchema`, `applicationRoleKeySchema`, `sha256HexSchema`, `auditOperationKeySchema`, `companyAccountStoredRowSchema`, `companyPasswordCredentialStoredRowSchema`, `companyOidcClientStoredRowSchema`, `companyOidcRedirectUriStoredRowSchema`, `companyOidcAuthorizationCodeStoredRowSchema`, `companyIdentityIdempotencyStoredRowSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/company-identity/environment.ts:139` | `companyIdentityRuntimeEnvSchema`, `companyIdentityDirectEnvSchema`, `companyIdentityTestEnvSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/company-identity/normalization.ts:53` | `normalizeCompanyUsername` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/company-identity/persistence.ts:19` | `persistCompanySsoSession`, `persistCompanyOidcAuthorizationCode` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/company-identity/runtime.ts:2` | `createCompanyIdentityRuntimeClient` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/company-identity/schema/index.ts:24` | `companyAccountStatusEnum`, `companyPasswordAlgorithmEnum`, `companyOrganizationTypeEnum`, `companyOrganizationStatusEnum`, `companyMembershipStatusEnum`, `companyRoleKeyEnum`, `companyApplicationStatusEnum`, `companyApplicationRoleStatusEnum`, `companySessionRevokeReasonEnum`, `companyOidcClientTypeEnum`, `companyOidcClientStatusEnum`, `companyOidcTokenAuthMethodEnum`, `companyOidcPkceMethodEnum`, `companyAuditActorTypeEnum`, `companyAuditOutcomeEnum`, `companyLoginOutcomeEnum`, `companyRateLimitKindEnum`, `companyIdempotencyStateEnum`, `companyAccounts`, `companyPasswordCredentials`, `companyOrganizations`, `companyOrganizationMemberships`, `companyRoleAssignments`, `companyApplications`, `companyApplicationRoleDefinitions`, `companyApplicationRoleAssignments`, `companySsoSessions`, `companyApplicationSessions`, `companyOidcClients`, `companyOidcRedirectUris`, `companyOidcAuthorizationCodes`, `companyIdentityAuditEvents`, `companyLoginAttempts`, `companyLoginRateLimitBuckets`, `companyIdentityIdempotencyRecords`, `companyAccountsRelations`, `companyPasswordCredentialsRelations`, `companyOrganizationsRelations`, `companyOrganizationMembershipsRelations`, `companyRoleAssignmentsRelations`, `companyApplicationsRelations`, `companyApplicationRoleDefinitionsRelations`, `companyApplicationRoleAssignmentsRelations`, `companySsoSessionsRelations`, `companyApplicationSessionsRelations`, `companyOidcClientsRelations`, `companyOidcRedirectUrisRelations`, `companyOidcAuthorizationCodesRelations`, `companyIdentityAuditEventsRelations`, `companyLoginAttemptsRelations`, `companyLoginRateLimitBucketsRelations`, `companyIdentityIdempotencyRecordsRelations` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/connection-options.ts:8` | `getDatabaseSocketPath` | needs check | Only tests use this symbol. |
| export | `packages/db/src/seed/codecamp-curriculum-data.ts:75` | `getPhaseACurriculumData`, `getPhaseBCurriculumData`, `getPhaseCCurriculumData`, `MODULE_REPO_MAP`, `getPhaseDCurriculumData` | needs check | Only tests use this symbol. |
| export | `packages/db/src/seed/index.ts:1` | `PORTFOLIO_PROJECTS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/db/src/student-usernames.ts:11` | `STUDENT_USERNAME_ADJECTIVES`, `STUDENT_USERNAME_NOUNS`, `STUDENT_USERNAME_NUMBERS` | needs check | Only tests use this symbol. |
| type | `packages/db/src/company-identity/contracts/index.ts:132` | `CompanyAccountId`, `CompanyUsernameInput`, `NormalizedCompanyUsername`, `CompanyUsernameNormalizationVersion`, `CompanyAccountStatus`, `PasswordHashAlgorithm`, `OrganizationStableKey`, `CompanyOrganizationType`, `ApplicationStableKey`, `CompanyRoleKey`, `ApplicationRoleKey`, `Sha256Hex`, `AuditOperationKey`, `CompanyAccountStoredRow`, `CompanyPasswordCredentialStoredRow`, `CompanyOidcClientStoredRow`, `CompanyOidcRedirectUriStoredRow`, `CompanyOidcAuthorizationCodeStoredRow`, `AuditMetadata`, `CompanyIdentityIdempotencyStoredRow` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/db/src/company-identity/environment.ts:168` | `CompanyIdentityRuntimeConfig`, `CompanyIdentityDirectConfig`, `CompanyIdentityTestConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/db/src/seed/codecamp-curriculum-data.ts:27` | `CurriculumContent`, `CurriculumLesson`, `CurriculumModule`, `CurriculumRepo` | needs check | Only tests use this symbol. |
| type | `packages/db/src/seed/codecamp-curriculum-data.ts:2872` | `PortfolioProject` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/db/src/seed/index.ts:2` | `PortfolioProject` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/db/accounting/drizzle.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `packages/db/company-identity/drizzle.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `packages/db/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/domain

Safe 63, needs check 1200, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/domain/src/articles/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/assignments/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/curriculum/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/gamification/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/licenses/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/progress/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/quiz/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/reports/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/stories/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/teachers/contracts.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/users/schema.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/workbooks/ai-proposal.ts:1` |  | safe | No import, script, or config reaches this file. |
| file | `packages/domain/src/workbooks/coverage-record.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `packages/domain/src/__tests__/fixtures/2-school.ts:76` | `lessonA`, `lessonB`, `attemptA`, `attemptB`, `responseA`, `responseB`, `masteryA`, `masteryB`, `tenantA`, `tenantB` | safe | No module imports this export. |
| export | `packages/domain/src/challenges/mutations.ts:31` | `ChallengeCreationConflictError` | safe | No module imports this export. |
| export | `packages/domain/src/challenges/schema.ts:48` | `studentChallengeClassSchema` | safe | No module imports this export. |
| export | `packages/domain/src/codecamp/intern-accounts.ts:32` | `REVIEW_JOB_SKIPPED_GENERATED_MARKER` | safe | No module imports this export. |
| export | `packages/domain/src/mastery/record-run.ts:19` | `RateLimitError` | safe | No module imports this export. |
| export | `packages/domain/src/primary-books/book-link.ts:8` | `BOOK_KEY_PATTERN` | safe | No module imports this export. |
| export | `packages/domain/src/primary-books/print/contracts.ts:77` | `PRINT_LOCALES` | safe | No module imports this export. |
| export | `packages/domain/src/primary-books/print/sync.ts:41` | `latestKitCommit`, `renderKitCss`, `buildKit`, `writeKit`, `checkKit`, `copyFixture` | safe | No module imports this export. |
| export | `packages/domain/src/primary-home/teacher-class-rules.ts:4` | `CLASS_ON_TRACK_PERCENT`, `CLASS_SOME_QUIET_PERCENT`, `CLASS_TREND_PERCENT` | safe | No module imports this export. |
| export | `packages/domain/src/primary-quest/season.ts:126` | `questDb`, `openQuest`, `battleItems` | safe | No module imports this export. |
| export | `packages/domain/src/rpg/definitions.ts:53` | `WARD_GAME_TYPES`, `ECHO_GAME_TYPES` | safe | No module imports this export. |
| type | `packages/domain/src/__tests__/mastery-persistence.contract.ts:62` | `MasteryPersistenceHarnessFactory` | safe | No module imports this type. |
| type | `packages/domain/src/codecamp/github-issues.ts:1` | `PracticeIssue` | safe | No module imports this type. |
| type | `packages/domain/src/codecamp/pr-reviews.ts:42` | `PrReviewReportRow` | safe | No module imports this type. |
| type | `packages/domain/src/codecamp/review-exercise.ts:38` | `AIClientWithReviewProvenanceLike` | safe | No module imports this type. |
| type | `packages/domain/src/csv.ts:2` | `CsvCell` | safe | No module imports this type. |
| type | `packages/domain/src/mastery/record-run.ts:112` | `MasteryHttpResponse` | safe | No module imports this type. |
| type | `packages/domain/src/primary-books/class-books.ts:89` | `ClassBookRow` | safe | No module imports this type. |
| type | `packages/domain/src/primary-books/mapping.ts:44` | `WordTime`, `ArticleRow`, `FlashcardRow` | safe | No module imports this type. |
| type | `packages/domain/src/primary-quest/season.ts:287` | `CommittedHit` | safe | No module imports this type. |
| type | `packages/domain/src/primary-voice/runtime.ts:48` | `VoiceRuntimeOptions` | safe | No module imports this type. |
| type | `packages/domain/src/student-login/access.ts:9` | `ManagedClassroom` | safe | No module imports this type. |
| type | `packages/domain/src/student-login/audit.ts:4` | `StudentLoginAuditAction` | safe | No module imports this type. |
| type | `packages/domain/src/testing/tenant-isolation-harness.ts:102` | `CrossTenantCase`, `SchoolFixture`, `TenantContext`, `TenantIsolationHarness` | safe | No module imports this type. |
| type | `packages/domain/src/workbooks/pdf-renderer.ts:13` | `WorkbookHtmlToPdf` | safe | No module imports this type. |
| type | `packages/domain/src/workbooks/render-port.ts:45` | `WorkbookRenderErrorOptions` | safe | No module imports this type. |
| file | `packages/domain/src/audit/index.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/domain/src/primary-books/print/kit-guard.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/domain/src/primary-books/print/sync.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/domain/src/workbooks/pdf-renderer.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/domain/src/workbooks/teacher-manual/lesson-fixture.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/domain/vitest.setup.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/domain/scripts/mmx-speech-provider.ts:33` | `runSpeechProcess`, `runSpeechDecodeProcess` | needs check | Export in a manual script. |
| export | `packages/domain/src/activity/activity-mastery-projection.ts:43` | `buildActivityMasteryCommand` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/activity/codecamp-activity-service.ts:65` | `createCodecampActivityHandlers` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/activity/drizzle-activity-persistence.ts:300` | `retryPendingActivityMasteryProjections` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/activity/index.ts:1` | `CODECAMP_MASTERY_SCHOOL_ID`, `DrizzleActivityPersistence`, `retryPendingActivityMasteryProjections`, `createCodecampActivityHandlers`, `buildActivityMasteryCommand`, `projectActivitySubmissionToMastery`, `DrizzleTutorialReportStore`, `DrizzleTutorialRepositoryVerifier`, `HttpTutorialRepositoryCaptureAdapter`, `prepareCodecampTutorialReport`, `prepareTutorialReportInputSchema`, `prepareTutorialReportResponseSchema`, `processCodecampTutorialReport`, `recordTutorialRepositoryState`, `reissueCodecampTutorialReportCredential`, `reissueTutorialReportCredentialInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/activity/tutorial-reporting.ts:17` | `prepareTutorialReportInputSchema`, `reissueTutorialReportCredentialInputSchema`, `DrizzleTutorialRepositoryVerifier`, `recordTutorialRepositoryState` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/ai/get-recommendation.ts:221` | `getRecommendation` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/ai/index.ts:1` | `getRecommendation` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/articles/contracts.ts:3` | `createArticleInputSchema`, `updateArticleInputSchema`, `listArticlesInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/articles/errors.ts:4` | `ArticleError`, `ArticleNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/articles/index.ts:1` | `articles`, `ARTICLE_PERMISSIONS`, `ArticleError`, `ArticleNotFoundError`, `legacyArticleIdSchema`, `resolveLegacyArticleId`, `resolveLegacyArticleIdInputSchema`, `resolveLegacyArticleIdOutputSchema`, `createArticleInputSchema`, `updateArticleInputSchema`, `listArticlesInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/articles/legacy-id.ts:13` | `legacyArticleIdSchema`, `resolveLegacyArticleIdOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/articles/permissions.ts:6` | `ARTICLE_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/assignments/contracts.ts:3` | `createAssignmentInputSchema`, `updateAssignmentInputSchema`, `submitAssignmentInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/assignments/errors.ts:4` | `AssignmentError`, `AssignmentNotFoundError`, `StudentNotAssignedError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/assignments/index.ts:2` | `assignments`, `studentAssignments`, `classrooms`, `classroomStudents`, `ASSIGNMENT_PERMISSIONS`, `AssignmentError`, `AssignmentNotFoundError`, `StudentNotAssignedError`, `createAssignmentInputSchema`, `updateAssignmentInputSchema`, `submitAssignmentInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/assignments/permissions.ts:6` | `ASSIGNMENT_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/challenges/index.ts:2` | `createClassChallenge`, `startClassChallengeRun`, `listClassChallenges`, `listOwnedChallengeClasses`, `listStudentChallengeClasses`, `createClassChallengeInputSchema`, `listClassChallengesInputSchema`, `listStudentClassesInputSchema`, `studentChallengeClassPageSchema`, `startClassChallengeRunInputSchema`, `CHALLENGE_PERMISSIONS`, `recordChallengeContribution` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/challenges/permissions.ts:4` | `CHALLENGE_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/archive-class.ts:14` | `archiveClass` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/create-assignment.ts:22` | `createAssignment` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/create-science-class.ts:47` | `createScienceClass` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/delete-assignment.ts:20` | `deleteAssignment` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/get-class-analytics-overview.ts:28` | `getClassAnalyticsOverview` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/get-class-curriculum.ts:21` | `getClassCurriculum` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/get-class-lesson-analytics.ts:22` | `getClassLessonAnalytics` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/get-class-roster.ts:14` | `getClassRoster`, `removeStudentFromClass` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/get-class.ts:15` | `getClassDetail` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/index.ts:6` | `listClassesWithCounts`, `createScienceClass`, `joinClass`, `AlreadyEnrolledError`, `getClassDetail`, `updateClass`, `archiveClass`, `getClassCurriculum`, `getClassRoster`, `removeStudentFromClass`, `getClassAnalyticsOverview`, `getClassLessonAnalytics`, `listAssignments`, `createAssignment`, `deleteAssignment`, `setClassroomTeachers`, `setClassroomTeachersInputSchema`, `setClassroomTeachersOutputSchema`, `SetClassroomTeachersError`, `CLASS_TEACHER_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/join-class.ts:6` | `AlreadyEnrolledError`, `joinClass` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/list-assignment.ts:24` | `listAssignments` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/list-classes-with-counts.ts:15` | `listClassesWithCounts` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/permissions.ts:4` | `CLASS_TEACHER_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/set-classroom-teachers.ts:10` | `SET_CLASSROOM_TEACHERS_STATUS` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/classes/set-classroom-teachers.ts:35` | `setClassroomTeachersInputSchema`, `setClassroomTeachersOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/classes/update-class.ts:14` | `updateClass` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/errors.ts:1` | `CodecampError`, `ModuleNotFoundError`, `LessonNotFoundError`, `ExerciseNotFoundError`, `ConversationNotFoundError`, `InternNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/index.ts:2` | `codecampModules`, `codecampLessons`, `codecampExercises`, `codecampQuizQuestions`, `codecampUserProgress`, `codecampChatConversations`, `codecampChatMessages`, `codecampExerciseRepos`, `codecampPrReviews`, `codecampWebhookEvents`, `CODECAMP_TUTOR_RESPONSE_SCHEMA_VERSION`, `DEFAULT_CODECAMP_TUTOR_MODEL`, `tutorInterventionLevelSchema`, `tutorModeSchema`, `tutorResourceActionSchema`, `curatedTutorResourceSchema`, `tutorResourceReferenceSchema`, `interventionResponseSchema`, `tutorContextSchema`, `buildCodecampTutorContextInputSchema`, `tutorProvenanceSchema`, `assembleTutorContext`, `createTutorContextFromAuthorizedActivity`, `buildCodecampTutorContext`, `resolveCodecampTutorModel`, `resolveTutorResource`, `selectTutorInterventionPolicy`, `buildTutorPrompt`, `createSafeTutorFallback`, `generateTutorIntervention`, `toVerifiedTutorSupportMetadata`, `persistTutorIntervention`, `recordTutorResourceUse`, `joinTutorInterventionToVerifiedEvidence`, `persistTutorInterventionInputSchema`, `recordTutorResourceUseInputSchema`, `joinTutorEvidenceInputSchema`, `listWebhookEvents`, `listDeadReviewJobs`, `requeueReviewJob`, `summarizeTutorSupport`, `assertCodecampModuleAssigned`, `CODECAMP_APK_CURRICULUM_VERSION`, `filterCodecampModulesForAssignment`, `hasCodecampAPKCurriculum`, `isCodecampAPKCurriculumReleased`, `CODECAMP_PERMISSIONS`, `CodecampError`, `ModuleNotFoundError`, `LessonNotFoundError`, `ExerciseNotFoundError`, `ConversationNotFoundError`, `InternNotFoundError`, `reviewExercise`, `reviewResultSchema`, `reviewResultGenerationSchema`, `reviewEvidenceReferenceSchema`, `reviewObjectiveEvidenceSchema`, `reviewTrustedCheckRunSchema`, `reviewTrustedContextSchema`, `apkPrEvaluationSchema`, `apkTrustedPrEvidenceSchema`, `isPassingAPKPrEvaluation`, `aiClientToGenerateReview`, `aiClientToGenerateReviewWithProvenance`, `resolveCodecampPrReviewModel`, `resolveReviewObjectiveBindings`, `validateReviewObjectiveEvidence`, `assertSafeReviewDiff`, `prepareReviewDiff`, `buildReviewRepairPrompt`, `DEFAULT_CODECAMP_PR_REVIEW_MODEL`, `CODECAMP_PR_REVIEW_CONTRACT_VIOLATION`, `CodecampPrReviewContractError`, `isCodecampPrReviewContractError`, `buildAdvisoryAPKObjectiveEvidence`, `buildAdvisoryPrObjectiveEvidence`, `listPriorPrReviewAttempts`, `recordAdvisoryPrReviewAttempt`, `recordTrustedPrReviewAttempt`, `resolveGraphBoundPrObjectives`, `projectVerifiedPrObjectiveToMastery`, `PR_REVIEW_PROMPT_VERSION`, `PR_REVIEW_RESPONSE_SCHEMA_VERSION`, `prEvaluationFixtureSchema`, `prEvaluationFixtureApprovalSchema`, `prEvaluationFixtureResultSchema`, `prEvaluationReleasePolicySchema`, `prEvaluationRuntimeRolloutModeSchema`, `assessPrEvaluationRelease`, `detectPrEvaluationModelDrift`, `decidePrEvaluationRollout`, `resolvePrEvaluationRuntimeRollout`, `isPrEvaluationCanarySelected`, `CODECAMP_PR_REVIEW_OVERRIDE_AUDIT_ACTION`, `prReviewObjectiveCorrectionSchema`, `prReviewOverrideInputSchema`, `prReviewOverrideAuditMetadataSchema`, `recordPrReviewOverride`, `listPrReviewOverrides` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/permissions.ts:3` | `CODECAMP_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/pr-evaluation-release.ts:4` | `prEvaluationFixtureApprovalSchema`, `prEvaluationRuntimeRolloutModeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/pr-review-attempts.ts:23` | `PR_REVIEW_RESPONSE_SCHEMA_VERSION`, `PR_REVIEW_PROMPT_VERSION`, `recordAdvisoryPrReviewAttempt` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/pr-review-overrides.ts:11` | `prReviewObjectiveCorrectionSchema`, `listPrReviewOverrides` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/pr-reviews.ts:425` | `listWebhookEvents` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/review-exercise.ts:52` | `DEFAULT_CODECAMP_PR_REVIEW_MODEL`, `assertSafeReviewDiff`, `CODECAMP_PR_REVIEW_CONTRACT_VIOLATION`, `buildReviewRepairPrompt`, `reviewEvidenceReferenceSchema`, `reviewObjectiveEvidenceSchema`, `reviewTrustedCheckRunSchema`, `reviewTrustedContextSchema`, `reviewResultGenerationSchema`, `validateReviewObjectiveEvidence`, `isPassingAPKPrEvaluation` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/review-jobs.ts:64` | `listDeadReviewJobs` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/codecamp/tutor.ts:21` | `CODECAMP_TUTOR_RESPONSE_SCHEMA_VERSION`, `DEFAULT_CODECAMP_TUTOR_MODEL`, `tutorResourceActionSchema`, `curatedTutorResourceSchema`, `tutorResourceReferenceSchema`, `tutorContextSchema`, `tutorProvenanceSchema`, `persistTutorInterventionInputSchema`, `recordTutorResourceUseInputSchema`, `joinTutorEvidenceInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/csv.ts:11` | `quoteCsvCell` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/curriculum/contracts.ts:3` | `getScienceLessonInputSchema`, `listScienceLessonsInputSchema`, `createScienceLessonInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/curriculum/errors.ts:1` | `CurriculumError`, `LessonNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/curriculum/get-lesson-by-slug.ts:23` | `getLessonBySlug` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/curriculum/index.ts:1` | `scienceLessons`, `getLessonBySlug`, `CURRICULUM_PERMISSIONS`, `CurriculumError`, `LessonNotFoundError`, `getScienceLessonInputSchema`, `listScienceLessonsInputSchema`, `createScienceLessonInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/curriculum/permissions.ts:3` | `CURRICULUM_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/curriculum/queries.ts:6` | `getLessonBySlug` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/gamification/contracts.ts:6` | `getGamificationProfileInputSchema`, `gamificationProfileSchema`, `updateGamificationXpInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/gamification/errors.ts:4` | `GamificationError`, `InsufficientXpError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/gamification/index.ts:1` | `gamificationProfiles`, `achievements`, `GAMIFICATION_PERMISSIONS`, `GamificationError`, `InsufficientXpError`, `getGamificationProfileInputSchema`, `gamificationProfileSchema`, `updateGamificationXpInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/gamification/permissions.ts:10` | `GAMIFICATION_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/index.ts:30` | `createTenantDB`, `getTenantDB`, `getUnscopedDB`, `TenantScopeError`, `classifyTable`, `resolveCodecampCompanyPrincipal`, `resolveLegacySalesCompanyPrincipal`, `resolveSalesCompanyPrincipal`, `getSystemDashboardData`, `systemDashboardQuerySchema`, `getSchoolSegmentsData`, `resolveLicenseScope`, `schoolSegmentsQuerySchema`, `scheduleFsrsReview`, `scheduleFsrsReviewNow` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/interventions/index.ts:1` | `listAlerts` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/interventions/list-alerts.ts:24` | `listAlerts` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/licenses/contracts.ts:3` | `createLicenseInputSchema`, `schoolLicenseRowSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/licenses/errors.ts:1` | `LicenseError`, `LicenseNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/licenses/index.ts:1` | `licenses`, `licenseOnUsers`, `LICENSE_PERMISSIONS`, `LicenseError`, `LicenseNotFoundError`, `createLicenseInputSchema`, `getSchoolSeatUsage`, `getSchoolLicenseTiming`, `schoolSeatUsageSchema`, `schoolLicenseTimingSchema`, `getSchoolLicenseView`, `listSeatHolders`, `schoolLicenseRowSchema`, `schoolLicenseViewOutputSchema`, `seatHoldersInputSchema`, `seatHoldersOutputSchema`, `SEAT_HOLDERS_PAGE_SIZE` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/licenses/permissions.ts:3` | `LICENSE_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/licenses/usage.ts:9` | `schoolSeatUsageSchema`, `schoolLicenseTimingSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/adapters/drizzle.ts:2` | `createDrizzleMasteryPersistence` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/adapters/memory.ts:2` | `createInMemoryMasteryPersistence` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/index.ts:6` | `recordRun`, `recordRunFailure`, `resetRateLimitStore`, `RateLimitError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/legacy.ts:5` | `RateLimitError`, `recordRun`, `recordRunFailure`, `resetRateLimitStore` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/persistence-contracts.ts:15` | `masteryProvenanceSchema`, `masteryAuditSchema`, `masteryCalibrationProvenanceSchema`, `masteryCalibrationMetricsSchema`, `masteryCommitRecordIdsSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/mastery/service.ts:4` | `commitMasteryEvidenceInputSchema`, `masteryCalibrationApprovalInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-avatar/gp.ts:12` | `GP_WEIGHTS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-avatar/index.ts:2` | `getAvatarProfile`, `setAvatarProfile`, `AvatarShopError`, `GP_DAILY_CAP`, `GP_WEIGHTS`, `WELCOME_GP`, `bangkokDayStart`, `gpBalance`, `gpForXp`, `grantGpForXp`, `getAvatarState`, `getClassAvatars`, `listAvatarShop`, `purchaseAvatarItem`, `resetStudentAvatar`, `setLoadout`, `tieOrder`, `toLaunchAvatar` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-avatar/permissions.ts:4` | `STUDENT_RECORD_WRITE` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/primary-books/class-book-contracts.ts:4` | `classBookModeSchema`, `pacingLessonSchema`, `studentBookLessonSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-books/contracts.ts:30` | `importReportSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-books/index.ts:3` | `lessonPackageSchema`, `BOOKS`, `splitKey`, `legacyArticleIdOf`, `toArticleRow`, `toQuestionRows`, `toTagRows`, `hasTags`, `toFlashcardRow`, `toLessonPackageJson`, `estimateWordTimes`, `stepTitleFromPlanLine`, `scriptBody`, `assignClassBook`, `listClassBooks`, `getTeacherBookSlots`, `setCurrentLesson`, `markLessonTaught`, `markStepDone`, `getClassBookPacing`, `getStudentClassBooks`, `listCatalogueBooks`, `getStudentBook`, `managedClass`, `getPreviewBook`, `listManagedClassBooks`, `teachLessonAgain`, `recordLessonProgress`, `getClassBookProgress`, `getStudentLessonSteps`, `toProgressCsv`, `guideLocaleOf`, `getLessonGuide`, `getTeacherLesson`, `resolveBookLesson`, `findTeacherClassBook`, `STUDENT_MCQ_COUNT`, `STUDENT_SAQ_COUNT`, `studentQuestionSet`, `resolveBookLink`, `printLessonSchema`, `getPrintLesson` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-books/print/contracts.ts:5` | `PRINT_FONT_FILE`, `PRINT_KIT_PATHS` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/primary-books/print/render.ts:164` | `PRINT_KIT_COMMIT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-books/progress-contracts.ts:23` | `progressStudentSchema`, `progressLessonSchema`, `studentStepSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/activity.ts:21` | `ARTICLE_READ`, `scopedRawDb`, `classMembersSql`, `windowEventsSql` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/contracts.ts:4` | `DASHBOARD_RANGES`, `DEFAULT_DASHBOARD_RANGE`, `schoolScopeSchema`, `platformScopeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/index.ts:2` | `dashboardWindow`, `getSchoolDashboard`, `NO_GRADE_KEY`, `getPlatformOverview` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/platform-contracts.ts:12` | `platformTotalsSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/school-contracts.ts:17` | `schoolKpisSchema`, `SCHOOL_ALERT_CODES`, `activityByDaySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/school-rules.ts:4` | `CEFR_MAIN_LEVELS`, `LOW_ACTIVITY_PERCENT`, `LOW_ACTIVITY_HIGH_PERCENT`, `LICENSE_SOON_DAYS`, `LICENSE_CRITICAL_DAYS`, `SEATS_NEARLY_FULL_PERCENT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-dashboards/school.ts:42` | `NO_GRADE_KEY` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-help/contracts.ts:15` | `helpVideoIdSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-help/events.ts:19` | `HELP_REPORT_PAGE_LIMIT` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-help/index.ts:3` | `helpEventReportInput`, `helpEventReportOutput`, `helpVideoIdSchema`, `recordHelpEventInput`, `recordHelpEventOutput`, `HELP_EVENT_RECORD`, `HELP_REPORT_READ`, `HELP_REPORT_PAGE_LIMIT`, `helpEventReport`, `recordHelpEvent` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-home/contracts.ts:4` | `studentHomeLessonSchema`, `studentHomeReadingSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-home/index.ts:3` | `getStudentHome`, `getTeacherHome`, `countStreakDays` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-home/teacher-class-csv.ts:5` | `TEACHER_CLASS_CSV_HEADER` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-home/teacher-contracts.ts:44` | `teacherHomeClassSchema`, `teacherHomeAssignmentSchema`, `teacherHomeStudentSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-lesson-attempts/index.ts:2` | `closeLessonAttempt`, `closeAttemptInTx`, `restartLesson`, `listLessonAttempts` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/backfill.ts:106` | `exportArticleRows`, `LEGACY_QUESTION_TABLE` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/contracts.ts:8` | `objectiveSkillSchema`, `graphFileReleaseSchema`, `tagsArticleObjectiveSchema`, `tagsVocabularySchema`, `tagsQuestionSchema`, `tagsObjectiveKeySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/evidence-contracts.ts:81` | `gameItemSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/evidence-jobs.ts:23` | `PRIMARY_EVIDENCE_MAX_ATTEMPTS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/evidence-policy.ts:20` | `evidenceRatingSchema`, `evidencePolicyRowSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/evidence-sources.ts:29` | `LEGACY_QUIZ_MODE`, `LEGACY_SAQ_MAX_SCORE`, `quizDetails`, `legacyQuizAnswers` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/index.ts:2` | `GRAPH_RELEASE`, `OBJECTIVE_KEY`, `objectiveKeyById`, `resolveObjective`, `exportArticleRows`, `LEGACY_QUESTION_TABLE`, `getArticleObjectives`, `getQuestionObjectives`, `getArticleWordNodes` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-mastery/record-evidence.ts:49` | `createDrizzleEvidenceResolver`, `matchWordNodes` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-quest/index.ts:3` | `BATTLE_GP`, `BOSS_FALLEN_GP`, `DAMAGE_PER_CORRECT`, `DASHBOARD_POLL_SECONDS`, `EXPECTED_DAMAGE_PER_STUDENT`, `EXPECTED_PARTICIPATION`, `HEARTBEAT_SECONDS`, `HEARTBEAT_STALE_SECONDS`, `HP_LOSS_PER_WRONG`, `MIN_BOSS_TARGET`, `PLAY_MINUTES`, `POWER_UPS`, `POWER_UP_CAP_PER_WEEK`, `RALLY_HORN_BONUS`, `RALLY_HORN_SECONDS`, `RALLY_MINUTES`, `REST_SECONDS`, `RESULT_MINUTES`, `SHARP_BLADE_BONUS`, `STUDENT_HP`, `applyWrongAnswer`, `bossTarget`, `canEarnPowerUp`, `hitDamage`, `CLASS_QUEST_NAME`, `QUEST_TEMPLATES`, `questTemplate`, `QuestError`, `assignClassQuest`, `cancelClassQuest`, `committedDamage`, `daysLeft`, `getStudentQuestCard`, `getTeacherQuestCard`, `weekStart`, `awardPowerUps`, `goalMet`, `mcCounts`, `readGoalFacts`, `countdownEndsAt`, `getBattleState`, `getQuestDashboard`, `pendingDamage`, `postHeartbeat`, `setQuestStatus` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-quest/rules.ts:13` | `MIN_BOSS_TARGET`, `HP_LOSS_PER_WRONG`, `REST_SECONDS`, `RALLY_HORN_BONUS`, `RALLY_HORN_SECONDS`, `HEARTBEAT_SECONDS`, `DASHBOARD_POLL_SECONDS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-quest/templates.ts:43` | `CLASS_QUEST_NAME` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-voice/contracts.ts:60` | `voiceEndReasonSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-voice/index.ts:7` | `createVoiceRuntime`, `normalizeProviderSummary` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-voice/provider.ts:58` | `MockVoiceSideband` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/primary-voice/sessions.ts:27` | `VoiceError`, `defaultVoiceRuntime`, `toVoiceSessionRecord`, `recoverVoiceSessions` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/progress/contracts.ts:3` | `recordActivityInputSchema`, `updateLessonProgressInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/progress/errors.ts:1` | `ProgressError`, `StudentNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/progress/index.ts:2` | `userActivity`, `userWordRecords`, `userSentenceRecords`, `lessonProgress`, `classroomStudents`, `classrooms`, `storyRecords`, `xpLogs`, `getLessonProgress`, `recordActivity`, `updateLessonProgress`, `PROGRESS_PERMISSIONS`, `ProgressError`, `StudentNotFoundError`, `recordActivityInputSchema`, `updateLessonProgressInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/progress/permissions.ts:3` | `PROGRESS_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/progress/queries.ts:107` | `getLessonProgress` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/contracts.ts:3` | `submitScienceAttemptInputSchema`, `getStudentScienceAttemptsInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/errors.ts:1` | `QuizError`, `AttemptNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/index.ts:1` | `scienceAttempts`, `startQuiz`, `QUIZ_PERMISSIONS`, `QuizError`, `AttemptNotFoundError`, `submitScienceAttemptInputSchema`, `getStudentScienceAttemptsInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/permissions.ts:3` | `QUIZ_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/queries.ts:6` | `startQuiz` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/quiz/submit-attempt.ts:36` | `startQuiz` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reading/fsrs-scheduler.ts:113` | `scheduleFsrsReview`, `scheduleFsrsReviewNow` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reading/get-school-segments.ts:20` | `schoolSegmentsQuerySchema`, `resolveLicenseScope`, `getSchoolSegmentsData` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reading/get-system-dashboard.ts:12` | `systemDashboardQuerySchema`, `getSystemDashboardData` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reading/index.ts:4` | `getSystemDashboardData`, `systemDashboardQuerySchema`, `getSchoolSegmentsData`, `resolveLicenseScope`, `schoolSegmentsQuerySchema`, `READING_PERMISSIONS`, `scheduleFsrsReview`, `scheduleFsrsReviewNow` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reading/permissions.ts:11` | `READING_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reports/errors.ts:1` | `ReportError`, `ClassNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reports/index.ts:2` | `userActivity`, `userWordRecords`, `userSentenceRecords`, `classroomStudents`, `classrooms`, `xpLogs`, `storyRecords`, `REPORT_PERMISSIONS`, `ReportError`, `ClassNotFoundError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/reports/permissions.ts:3` | `REPORT_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/rpg/index.ts:2` | `RPG_COSMETICS`, `RPG_QUESTS`, `getEligibleRpgRewards`, `equipMyRpgCosmetic`, `RpgCosmeticLockedError`, `getMyRpgState`, `RPG_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/rpg/mutations.ts:23` | `RpgCosmeticLockedError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/rpg/permissions.ts:4` | `RPG_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/sales-mastery.ts:107` | `CODECAMP_MASTERY_TENANT_KEY`, `salesMasteryTenantResolutionInputSchema`, `salesMasteryEvidenceReadInputSchema`, `salesMasteryRetryInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/sales/errors.ts:27` | `AudioStorageError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/sales/index.ts:10` | `aiClientToEvaluateRoleplay`, `buildEvaluationPrompt` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/sales/mutations.ts:550` | `authorizeSalesChat` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/sales/roleplay-evaluator.ts:51` | `scoreRoleplayEvaluation` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/sales/schema.ts:23` | `moduleOutputSchema`, `lessonOutputSchema`, `quizQuestionOutputSchema`, `learnerQuizQuestionOutputSchema`, `learnerModuleLessonOutputSchema`, `moduleBySlugOutputSchema`, `dashboardModuleOutputSchema`, `ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES`, `quizResultOutputSchema`, `progressOutputSchema`, `chatMessageOutputSchema`, `conversationOutputSchema`, `salesRepModuleDetailOutputSchema`, `salesRepScenarioDetailOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/stories/contracts.ts:16` | `storyCardSchema`, `storyChapterItemSchema`, `chapterWordSchema`, `STORY_LA_MAX_CHARS`, `STORY_LA_CHARS_PER_LEVEL`, `STORY_LA_FEEDBACK_TRIES`, `storyQuestionKindSchema`, `chapterMcqSchema`, `chapterWrittenQuestionSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/stories/index.ts:1` | `stories`, `storyRecords`, `STORY_PERMISSIONS`, `StoryError`, `StoryNotFoundError`, `ChapterNotFoundError`, `STORIES_PAGE_SIZE`, `listPrimaryStoriesInputSchema`, `listPrimaryStoriesOutputSchema`, `storyCardSchema`, `getStoryForStudentInputSchema`, `getStoryForStudentOutputSchema`, `storyChapterItemSchema`, `storyCharacterSchema`, `getChapterForStudentInputSchema`, `getChapterForStudentOutputSchema`, `chapterWordSchema`, `STORY_MCQ_PER_QUIZ`, `STORY_XP_PER_CORRECT_MC`, `STORY_SA_MAX_XP`, `STORY_LA_MAX_XP`, `STORY_LA_MAX_CHARS`, `STORY_LA_CHARS_PER_LEVEL`, `STORY_LA_FEEDBACK_TRIES`, `STORY_ACTIVITY_TYPES`, `storyQuestionKindSchema`, `storyLaMinChars`, `getChapterQuestionsInputSchema`, `getChapterQuestionsOutputSchema`, `chapterMcqSchema`, `chapterWrittenQuestionSchema`, `gradeChapterMcqInputSchema`, `gradeChapterMcqOutputSchema`, `retakeChapterMcqInputSchema`, `retakeChapterMcqOutputSchema`, `resolveChapterWrittenInputSchema`, `resolveChapterWrittenOutputSchema`, `getChapterWrittenQuestionInputSchema`, `getChapterWrittenQuestionOutputSchema`, `LEGACY_STORY_TABLE`, `legacyStoryIdSchema`, `resolveLegacyChapter`, `resolveLegacyStoryId`, `resolveLegacyStoryIdInputSchema`, `resolveLegacyStoryIdOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/stories/legacy-id.ts:9` | `LEGACY_STORY_TABLE`, `legacyStoryIdSchema`, `resolveLegacyStoryIdOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/stories/permissions.ts:3` | `STORY_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/student-login/class-session.ts:28` | `CLASS_SESSION_LIFETIME_MS`, `STUDENT_AVATARS`, `findOpenSession` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/student-login/index.ts:7` | `STUDENT_LOGIN_LIMITS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-my-gamification.ts:31` | `getMyGamification` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-achievements.ts:14` | `getStudentAchievements` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-assignments.ts:14` | `getStudentAssignments` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-class-analytics.ts:20` | `getStudentClassAnalytics` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-gamification-profile.ts:32` | `getStudentGamificationProfile` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-lesson-analytics.ts:19` | `getStudentLessonAnalytics` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-lesson-progress.ts:18` | `getStudentLessonProgress` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/get-student-mastery-profile.ts:20` | `getStudentMasteryProfile` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/students/index.ts:6` | `getStudentAssignments`, `getStudentAchievements`, `getStudentGamificationProfile`, `getStudentMasteryProfile`, `getStudentClassAnalytics`, `getStudentLessonAnalytics`, `getStudentLessonProgress`, `getMyGamification` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/teachers/get-teacher-dashboard.ts:16` | `getTeacherDashboard` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/teachers/index.ts:2` | `TEACHER_PERMISSIONS`, `GetTeacherClassesInput`, `GetTeacherClassesOutput`, `GetTeacherClassesWithCountsOutput`, `TeacherClassOutput`, `TeacherClassWithCountOutput`, `getTeacherDashboard`, `MoveTeacherSchoolError`, `MOVE_TEACHER_SCHOOL_STATUS`, `moveTeacherToSchool`, `moveTeacherToSchoolInputSchema`, `moveTeacherToSchoolOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/teachers/move-teacher-school.ts:11` | `moveTeacherToSchoolInputSchema`, `moveTeacherToSchoolOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/teachers/permissions.ts:4` | `TEACHER_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/teachers/schema.ts:6` | `GetTeacherClassesInput`, `TeacherClassOutput`, `GetTeacherClassesOutput`, `TeacherClassWithCountOutput`, `GetTeacherClassesWithCountsOutput` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/users/contracts.ts:3` | `getUserInputSchema`, `listUsersInputSchema`, `updateUserInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/users/errors.ts:1` | `UserError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/users/index.ts:1` | `users`, `getUserByGithubUsername`, `USER_PERMISSIONS`, `UserError`, `UserNotFoundError`, `getUserInputSchema`, `listUsersInputSchema`, `updateUserInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/users/permissions.ts:3` | `USER_PERMISSIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/users/queries.ts:151` | `getUserByGithubUsername` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/artifact-store.ts:62` | `createWorkbookArtifactStore` | needs check | Only tests use this symbol. |
| export | `packages/domain/src/workbooks/contracts.ts:16` | `workbookAssetMetadataSchema`, `workbookQuestionSchema`, `workbookVocabularyItemSchema`, `workbookMatchItemSchema`, `workbookFillItemSchema`, `workbookOrderQuestionSchema`, `workbookCompletionPromptSchema`, `workbookMcAnswerSchema`, `workbookOrderAnswerSchema`, `workbookTranslationParagraphSchema`, `workbookArticleImageSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/digest.ts:8` | `WORKBOOK_DIGEST_ALGORITHM` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/edition-repository-port.ts:11` | `workbookPublicationEventTypeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/edition-state.ts:16` | `WORKBOOK_DRAFT_TRANSITIONS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/html-renderer.ts:106` | `createHtmlWorkbookRenderer` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/legacy-workbook-importer.ts:215` | `legacyWorkbookImportInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/primary-advantage-normalizer.ts:12` | `primaryAdvantageArticleSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/domain/src/workbooks/reading-advantage-normalizer.ts:10` | `readingAdvantageArticleSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/scripts/mmx-speech-provider.ts:12` | `SpeechProcessOptions`, `SpeechProcessRunner`, `SpeechDecodeProcessRunner`, `MmxSpeechProviderOptions`, `FfmpegSpeechAudioValidatorOptions` | needs check | Export in a manual script. |
| type | `packages/domain/src/activity/codecamp-activity-service.ts:21` | `CodecampActivityHandlers` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/activity/index.ts:2` | `CodecampActivityHandlers`, `TutorialRepositoryCapturePort` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/activity/tutorial-reporting.ts:36` | `TutorialRepositoryCapturePort` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/ai/get-recommendation.ts:17` | `AttemptWithRelations` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/ai/index.ts:1` | `AttemptWithRelations` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/articles/contracts.ts:13` | `CreateArticleInput`, `UpdateArticleInput`, `ListArticlesInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/articles/index.ts:16` | `CreateArticleInput`, `UpdateArticleInput`, `ListArticlesInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/assignments/contracts.ts:13` | `CreateAssignmentInput`, `UpdateAssignmentInput`, `SubmitAssignmentInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/assignments/due-date.ts:6` | `DueDateStatus` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/assignments/index.ts:20` | `CreateAssignmentInput`, `UpdateAssignmentInput`, `SubmitAssignmentInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/audit/dsar.ts:20` | `DsarProfile`, `DsarBundle` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/challenges/contributions.ts:19` | `ChallengeSavedCompletion`, `ChallengeContributionResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/challenges/index.ts:4` | `ChallengeGameCapability`, `CreateClassChallengeInput`, `ListClassChallengesInput`, `ListStudentClassesInput`, `StudentChallengeClassPage`, `StartClassChallengeRunInput`, `ChallengeContributionResult`, `ChallengeSavedCompletion` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/classes/index.ts:24` | `SetClassroomTeachersInput`, `SetClassroomTeachersOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/classes/set-classroom-teachers.ts:41` | `SetClassroomTeachersInput`, `SetClassroomTeachersOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/index.ts:48` | `InterventionResponse`, `CuratedTutorResource`, `TutorContext`, `BuildCodecampTutorContextInput`, `TutorProvenance`, `TutorInterventionPolicy`, `VerifiedTutorSupportMetadata`, `TutorObjectGenerator`, `PersistTutorInterventionInput`, `RecordTutorResourceUseInput`, `JoinTutorEvidenceInput`, `CodecampWebhookEventOutcome`, `ListReviewJobsInput`, `RequeueReviewJobInput`, `ReviewJobRow`, `TutorSupportSummary`, `PracticeIssue`, `ReviewExerciseInput`, `CodecampPrReviewContractFailure`, `ReviewResult`, `ReviewTrustedContext`, `APKPrEvaluation`, `APKTrustedPrEvidence`, `ReviewGenerationProvenance`, `ReviewGenerationWithProvenance`, `PreparedReviewDiff`, `ReviewContractFailureKind`, `ReviewExerciseOutput`, `ReviewRepairProvenance`, `AdvisoryObjectiveEvidence`, `RecordAdvisoryPrReviewAttemptInput`, `RecordTrustedPrReviewAttemptInput`, `RecordPrReviewAttemptResult`, `PriorPrReviewAttemptSummary`, `PriorPrReviewObjectiveSummary`, `GraphBoundPrObjective`, `VerifiedPrObjectiveResult`, `ProjectVerifiedPrObjectiveInput`, `PrEvaluationReleaseReport`, `PrEvaluationDriftReport`, `PrEvaluationRolloutMode`, `PrEvaluationRolloutDecision`, `PrEvaluationRuntimeRollout` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/intern-accounts.ts:82` | `TutorSupportSummary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/pr-evaluation-release.ts:43` | `PrEvaluationReleaseReport`, `PrEvaluationDriftReport`, `PrEvaluationRolloutMode`, `PrEvaluationRuntimeRollout`, `PrEvaluationRolloutDecision` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/pr-review-attempts.ts:28` | `AdvisoryObjectiveEvidence`, `RecordAdvisoryPrReviewAttemptInput`, `RecordPrReviewAttemptResult`, `PriorPrReviewObjectiveSummary`, `PriorPrReviewAttemptSummary`, `GraphBoundPrObjective`, `VerifiedPrObjectiveResult`, `ProjectVerifiedPrObjectiveInput`, `RecordTrustedPrReviewAttemptInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/pr-reviews.ts:20` | `CodecampWebhookEventOutcome` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/review-exercise.ts:16` | `AIClientLike` | needs check | Only tests use this symbol. |
| type | `packages/domain/src/codecamp/review-exercise.ts:46` | `ReviewGenerationWithProvenance`, `PreparedReviewDiff`, `ReviewExerciseInput`, `CodecampPrReviewContractFailure`, `ReviewTrustedContext`, `APKTrustedPrEvidence`, `ReviewRepairProvenance`, `ReviewExerciseOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/review-jobs.ts:28` | `ListReviewJobsInput`, `ReviewJobRow`, `RequeueReviewJobInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/codecamp/tutor.ts:176` | `InterventionResponse`, `CuratedTutorResource`, `TutorContext`, `BuildCodecampTutorContextInput`, `TutorProvenance`, `PersistTutorInterventionInput`, `RecordTutorResourceUseInput`, `JoinTutorEvidenceInput`, `TutorInterventionPolicy`, `VerifiedTutorSupportMetadata`, `TutorObjectGenerator` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/company-identity-principal.ts:15` | `ResolvedSalesCompanyPrincipal`, `SalesCompanyIdentity`, `ResolvedCodecampCompanyPrincipal`, `CodecampCompanyIdentity` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/curriculum/contracts.ts:21` | `CreateScienceLessonInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/curriculum/index.ts:10` | `CreateScienceLessonInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/gamification/contracts.ts:10` | `GetGamificationProfileInput`, `GamificationProfile`, `UpdateGamificationXpInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/gamification/index.ts:10` | `GetGamificationProfileInput`, `GamificationProfile`, `UpdateGamificationXpInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/index.ts:33` | `TenantDB`, `TableClassification`, `CodecampCompanyIdentity`, `ResolvedCodecampCompanyPrincipal`, `SalesCompanyIdentity`, `ResolvedSalesCompanyPrincipal`, `SystemDashboardQuery`, `SystemDashboardData`, `SchoolSegmentsQuery`, `SchoolSegmentsData`, `LicenseScopeResult`, `FsrsRating`, `FsrsCardState`, `FsrsReviewInput`, `FsrsReviewOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/licenses/contracts.ts:11` | `CreateLicenseInput`, `SeatHoldersInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/licenses/index.ts:8` | `CreateLicenseInput`, `SchoolSeatUsage`, `SchoolLicenseTiming`, `SchoolLicenseViewOutput`, `SeatHoldersInput`, `SeatHoldersOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/licenses/usage.ts:17` | `SchoolSeatUsage`, `SchoolLicenseTiming` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/adapters/drizzle.ts:3` | `DrizzleMasteryPersistenceOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/adapters/memory.ts:3` | `MasteryPersistencePort` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/commit-evidence.ts:13` | `CommitMasteryEvidenceDependencies`, `ApproveMasteryCalibrationDependencies` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/index.ts:10` | `MasteryHttpResponse`, `DrizzleMasteryPersistenceOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/legacy.ts:2` | `MasteryHttpResponse` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/persistence-contracts.ts:333` | `MasteryProvenance`, `MasteryAudit` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/persistence-ports.ts:11` | `MasteryPersistenceErrorCode`, `MasteryPersistenceErrorOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/mastery/service.ts:6` | `CommitMasteryEvidenceInput`, `ApproveMasteryCalibrationInput`, `MasteryPersistencePort` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-avatar/errors.ts:2` | `AvatarShopErrorCode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-avatar/index.ts:2` | `AvatarCtx`, `AvatarProfile`, `SetAvatarProfileInput`, `AvatarShopErrorCode`, `AvatarInventoryItem`, `AvatarLoadout`, `AvatarShopItem`, `AvatarSlot`, `AvatarState`, `ClassAvatar`, `LaunchAvatar`, `PurchaseAvatarItemInput`, `SetLoadoutInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/class-book-contracts.ts:5` | `ClassBookMode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/contracts.ts:34` | `ImportReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/guides.ts:23` | `GuideRow` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/import.ts:26` | `ImportLessonPackageOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/index.ts:3` | `LessonPackage`, `QuestionRows`, `TagRows`, `TagGraphRelease`, `ImportLessonPackageOptions`, `GuideRow`, `TeachingNotes`, `PrintLesson` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/mapping.ts:182` | `TagRows`, `TagGraphRelease` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-books/step-map.ts:8` | `WorkbookStep` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-dashboards/activity.ts:24` | `ActivityCountParams`, `ClassStudentStats`, `PlatformSchoolActivity` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-dashboards/contracts.ts:9` | `DashboardRange` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-dashboards/platform-contracts.ts:32` | `PlatformTotals` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-help/index.ts:8` | `HelpEventReport`, `HelpEventReportInput`, `RecordHelpEventInput`, `RecordHelpEventOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-lesson-attempts/attempts.ts:33` | `CloseAttemptParams` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-lesson-attempts/contracts.ts:19` | `CloseReason` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-lesson-attempts/index.ts:2` | `CloseAttemptParams` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/backfill.ts:77` | `TagBackfillReport`, `BackfillPrimaryTagsOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/contracts.ts:125` | `TagsExport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/coverage.ts:35` | `TagCoverageReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/evidence-contracts.ts:42` | `QuestionStepDetails`, `GameItem` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/evidence-jobs.ts:26` | `PrimaryEvidenceEnqueueRequest`, `PrimaryEvidenceEnqueuePort`, `RunPrimaryEvidenceJobOptions`, `PrimaryEvidenceJobContext`, `PrimaryEvidenceJobHandler` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/evidence-policy.ts:37` | `EvidencePolicyRow` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/evidence-summary.ts:13` | `PrimaryEvidenceSummary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/index.ts:8` | `ArticleObjectiveRow`, `BackfillPrimaryTagsOptions`, `LessonBankText`, `QuestionObjectiveRow`, `QuestionType`, `TagBackfillPort`, `TagBackfillReport`, `WordNodeRow`, `TagCoverageInput`, `TagCoverageReport`, `ArticleObjective`, `QuestionObjective`, `ArticleWordNode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/queries.ts:17` | `ArticleObjective` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-mastery/record-evidence.ts:66` | `RecordPrimaryEvidenceOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-quest/errors.ts:2` | `QuestErrorCode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-quest/index.ts:8` | `PowerUp`, `WrongAnswerResult`, `QuestCopy`, `QuestGoal`, `QuestGoalKind`, `QuestTemplate`, `QuestErrorCode`, `ResolveGameCapability`, `GoalFacts`, `AssignClassQuestInput`, `ClassQuest`, `QuestPowerUpRow`, `StudentQuestCard`, `TeacherQuestCard`, `QuestBattleState`, `QuestDashboardState`, `QuestHeartbeatInput`, `SetQuestStatusInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-quest/rules.ts:76` | `WrongAnswerResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-quest/season.ts:56` | `ResolveGameCapability` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-quest/templates.ts:16` | `QuestGoalKind` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/contracts.ts:83` | `VoiceEndReason` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/index.ts:7` | `VoiceRuntime`, `SidebandState`, `ProviderSummary` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/instructions.ts:2` | `VoiceLessonContext` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/runtime.ts:24` | `SidebandState` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/sessions.ts:24` | `VoiceErrorCode`, `VoiceCtx` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/primary-voice/views.ts:108` | `ClassVoiceStudent`, `ClassVoiceUsage`, `SchoolVoiceMonth`, `SchoolVoiceCosts` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/progress/contracts.ts:9` | `RecordActivityInput`, `UpdateLessonProgressInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/progress/index.ts:18` | `RecordActivityInput`, `UpdateLessonProgressInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/quiz/contracts.ts:10` | `SubmitScienceAttemptInput`, `GetStudentScienceAttemptsInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/quiz/index.ts:2` | `QuizHttpResponse`, `SubmitScienceAttemptInput`, `GetStudentScienceAttemptsInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/quiz/queries.ts:6` | `QuizHttpResponse` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/quiz/submit-attempt.ts:20` | `QuizHttpResponse` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/reading/fsrs-scheduler.ts:29` | `FsrsRating`, `FsrsCardState`, `FsrsReviewInput`, `FsrsReviewOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/reading/get-school-segments.ts:24` | `SchoolSegmentsQuery`, `LicenseScopeResult`, `SchoolSegmentsData` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/reading/get-system-dashboard.ts:23` | `SystemDashboardQuery`, `SystemDashboardData` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/reading/index.ts:6` | `SystemDashboardQuery`, `SystemDashboardData`, `SchoolSegmentsQuery`, `SchoolSegmentsData`, `LicenseScopeResult`, `FsrsRating`, `FsrsCardState`, `FsrsReviewInput`, `FsrsReviewOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/rpg/definitions.ts:42` | `EligibleRpgReward` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/rpg/index.ts:5` | `EligibleRpgReward`, `RpgCompletionFacts` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/sales-mastery.ts:207` | `SalesMasteryTenantBinding`, `SalesMasteryProjectionReceipt`, `SalesMasteryProjection`, `ScopedSalesMasteryProjectionOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/sales/contracts.ts:48` | `RoleplayEvaluationContext`, `EvaluateRoleplayFn`, `RubricCriteria` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/sales/learning-path.ts:24` | `SalesLessonType`, `SalesLearningPathReadModel`, `AccessibleSalesLesson`, `AccessibleSalesScenario` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/sales/progression.ts:2` | `SalesLearningModuleRef`, `SalesLearningLessonRef`, `SalesModuleAccess`, `SalesLessonAccess`, `SalesLearningAccess` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/sales/roleplay-evaluator.ts:15` | `AIClientLike` | needs check | Only tests use this symbol. |
| type | `packages/domain/src/sales/schema.ts:191` | `RoleplayAudioInput`, `ModuleOutput`, `LessonOutput`, `QuizQuestionOutput`, `LearnerQuizQuestionOutput`, `LearnerModuleLessonOutput`, `ModuleBySlugOutput`, `LessonDetailOutput`, `ScenarioDetailOutput`, `DashboardModuleOutput`, `AdminCurriculumOutput`, `RoleplayAttemptInput`, `RoleplayAttemptOutput`, `QuizResultOutput`, `ProgressOutput`, `ChatMessageOutput`, `ConversationOutput`, `SalesCohortRepOutput`, `SalesRepDetailOutput`, `ApproveContentOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/stories/contracts.ts:25` | `StoryCard`, `StoryChapterItem`, `StoryCharacter`, `ChapterWord`, `StoryQuestionKind` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/stories/index.ts:40` | `GetChapterForStudentInput`, `GetChapterForStudentOutput`, `ChapterWord`, `GetStoryForStudentInput`, `GetStoryForStudentOutput`, `StoryChapterItem`, `StoryCharacter`, `StoryQuestionKind`, `GetChapterQuestionsInput`, `GetChapterQuestionsOutput`, `GradeChapterMcqInput`, `GradeChapterMcqOutput`, `RetakeChapterMcqInput`, `RetakeChapterMcqOutput`, `ResolveChapterWrittenInput`, `ResolveChapterWrittenOutput`, `GetChapterWrittenQuestionInput`, `GetChapterWrittenQuestionOutput`, `ListPrimaryStoriesInput`, `ListPrimaryStoriesOutput`, `StoryCard` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/student-login/card-token.ts:22` | `IssuedCardToken` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/student-login/errors.ts:2` | `StudentLoginErrorCode` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/student-login/picture-password.ts:189` | `AssignedPicturePassword` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/student-login/usernames.ts:50` | `StudentLoginSeed`, `ProvisionedStudentLogin`, `FailedStudentLogin`, `ProvisionStudentLoginsResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/teachers/index.ts:17` | `MoveTeacherToSchoolInput`, `MoveTeacherToSchoolOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/teachers/move-teacher-school.ts:18` | `MoveTeacherToSchoolInput`, `MoveTeacherToSchoolOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/users/contracts.ts:22` | `UpdateUserInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/users/index.ts:10` | `UpdateUserInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/artifact-store.ts:14` | `WorkbookStorageClient` | needs check | Only tests use this symbol. |
| type | `packages/domain/src/workbooks/content-catalog-port.ts:9` | `WorkbookCatalogErrorCode`, `WorkbookCatalogErrorOptions`, `WorkbookCatalogContext`, `WorkbookCatalogQuery`, `WorkbookSourceSummary`, `ContentCatalogPort` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/contracts.ts:267` | `WorkbookAssetKey`, `WorkbookAssetMetadata`, `WorkbookQuestion`, `WorkbookVocabularyItem`, `WorkbookMatchItem`, `WorkbookFillItem`, `WorkbookOrderQuestion`, `WorkbookCompletionPrompt`, `WorkbookMcAnswer`, `WorkbookOrderAnswer`, `WorkbookTranslationParagraph`, `WorkbookArticleImage`, `WorkbookIncompatibilityError` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/create-draft.ts:12` | `CreateWorkbookDraftInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/edition-repository-port.ts:21` | `WorkbookPublicationEventType` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/edition-state.ts:40` | `WorkbookPublicationErrorCode`, `WorkbookPublicationErrorOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/in-memory-edition-repository.ts:15` | `InMemoryWorkbookEditionStore` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/legacy-workbook-importer.ts:229` | `LegacyWorkbookImportInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/render-port.ts:36` | `WorkbookRenderErrorCode` | needs check | Only tests use this symbol. |
| type | `packages/domain/src/workbooks/source-drift.ts:5` | `WorkbookSourceDriftIdentity`, `WorkbookSourceDriftReport` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/teacher-manual/compiler.ts:11` | `CompileTeacherManualResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/domain/src/workbooks/teacher-manual/types.ts:74` | `EndMatterData` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/domain/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/game-cartridges

Safe 311, needs check 400, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/game-cartridges/src/abyssal-well.ts:28` | `ABYSSAL_WELL_ID`, `ABYSSAL_WELL_CONFIG` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/alchemists-synthesis.ts:28` | `ALCHEMISTS_SYNTHESIS_ID`, `ALCHEMISTS_SYNTHESIS_ROUND_LIMIT` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/archers-revenge.ts:29` | `ARCHERS_REVENGE_ID`, `GAME_WIDTH`, `GAME_HEIGHT`, `ARCHERS_REVENGE_COLUMNS`, `ARCHERS_REVENGE_ROWS`, `ARCHERS_REVENGE_ENEMIES_PER_WAVE`, `ARCHERS_REVENGE_AVAILABLE_ACTIONS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/astral-mage.ts:29` | `ASTRAL_MAGE_ID`, `ASTRAL_MAGE_CANVAS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/castle-defense.ts:29` | `CASTLE_DEFENSE_CANVAS`, `CASTLE_DEFENSE_WAVE_CONFIGS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/devourer-slime.ts:29` | `DEVOURER_SLIME_ID`, `ORB_RADIUS`, `SLIME_MOVEMENT_SPEED`, `KNIGHT_EAT_BONUS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/dragon-flight.ts:34` | `DRAGON_FLIGHT_ID`, `DRAGON_RIDER_ID`, `DRAGON_FLIGHT_DURATION_MS`, `DRAGON_FLIGHT_GUARDIAN_MS`, `DRAGON_FLIGHT_GUARDIAN_HEALTH`, `DRAGON_FLIGHT_CANVAS`, `DRAGON_FLIGHT_KEYBOARD_BINDINGS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/flight-parallax.ts:14` | `FLIGHT_PARALLAX_SPEEDS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/griffin-sky-joust.ts:54` | `GRIFFIN_SKY_JOUST_MAX_HEALTH`, `GRIFFIN_SKY_JOUST_MAX_FRAME_DELTA_MS`, `GRIFFIN_SKY_JOUST_AVAILABLE_ACTIONS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/gryphon-patrol.ts:37` | `GRYPHON_PATROL_ID`, `GRYPHON_PATROL_CANVAS`, `GRYPHON_PATROL_AVAILABLE_ACTIONS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/haunted-library.ts:29` | `HAUNTED_LIBRARY_ID`, `HAUNTED_LIBRARY_CANVAS`, `GAME_HEIGHT`, `FLOOR_HEIGHT`, `TRAMPOLINE_HEIGHT`, `TRAMPOLINE_WIDTH`, `PLAYER_WIDTH`, `DOOR_WIDTH`, `DOOR_HEIGHT`, `INVULNERABILITY_MS`, `PLAYER_SPEED`, `PLAYER_STEP`, `GHOST_SPEED`, `BAT_SPEED`, `FLOOR_COUNT`, `MAX_FRAME_DELTA_MS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/labyrinth-goblin-king.ts:17` | `LABYRINTH_GOBLIN_KING_ID`, `LABYRINTH_CANVAS`, `LABYRINTH_GRID` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/magic-defense.ts:27` | `MAGIC_DEFENSE_ID`, `MAGIC_DEFENSE_CANVAS`, `MAGIC_DEFENSE_DEFAULT_TIMER_SECONDS`, `MAGIC_DEFENSE_TIMER_SECONDS`, `MAGIC_DEFENSE_SECONDS_PER_ITEM`, `MAGIC_DEFENSE_CASTLES`, `MAGIC_DEFENSE_KEYBOARD_BINDINGS`, `MAGIC_DEFENSE_TOWER_DISPLAY`, `MAGIC_DEFENSE_ENEMY_Z_FAR`, `MAGIC_DEFENSE_ENEMY_Z_NEAR`, `magicDefenseTimerSeconds` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/maps/astral-mage-map.ts:148` | `isPointInsideAstralMageSolid` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/maps/devourer-slime-map.ts:179` | `isPointInsideDevourerSlimeSolid` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/maps/realm-carver-map.ts:148` | `isPointInsideRealmCarverSolid` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/paladins-twin-soul.ts:30` | `PALADINS_TWIN_SOUL_ID` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/potion-rush.ts:28` | `POTION_RUSH_ID`, `POTION_RUSH_CAULDRON_COUNT` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/realm-carver.ts:30` | `REALM_CARVER_ID`, `REALM_CARVER_CANVAS`, `getRealmCarverDirectionFromPointer` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/rpg-battle.ts:27` | `RPG_BATTLE_ID`, `RPG_BATTLE_STREAK_DAMAGE_INTERVAL`, `RPG_BATTLE_PLAYER_DAMAGE`, `RPG_BATTLE_KEYBOARD_BINDINGS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/rune-forge-chamber.ts:27` | `RUNE_FORGE_CHAMBER_ID`, `RUNE_FORGE_CHAMBER_CANVAS`, `RUNE_FORGE_CHAMBER_AVAILABLE_ACTIONS`, `RUNE_FORGE_CHAMBER_MAX_HEALTH`, `RUNE_FORGE_CHAMBER_SENTENCE_TIMER_MS`, `RUNE_FORGE_CHAMBER_WRONG_RUNE_DAMAGE`, `RUNE_FORGE_CHAMBER_ROTATION_SPEED`, `RUNE_FORGE_CHAMBER_ORBIT_RADIUS`, `RUNE_FORGE_CHAMBER_MAX_VISIBLE_RUNES` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/rune-match.ts:30` | `RUNE_MATCH_ID`, `RUNE_MATCH_CANVAS`, `RUNE_MATCH_DEFAULT_ROWS`, `RUNE_MATCH_DEFAULT_COLUMNS`, `findMatches`, `applyGravity` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/shadow-gate-dungeon.ts:16` | `SHADOW_GATE_DUNGEON_ID`, `SHADOW_GATE_DUNGEON_CANVAS`, `SHADOW_GATE_PLAYER_SPEED`, `SHADOW_GATE_CREATURE_SPEED` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/sorcerer-ziggurat.ts:29` | `SORCERER_ZIGGURAT_ID`, `SORCERER_ZIGGURAT_CANVAS` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/spellweavers-run.ts:20` | `SPELLWEAVERS_RUN_ID`, `SPELLWEAVERS_RUN_KEYBOARD`, `SPELLWEAVERS_RUN_ORB_SPEED` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/storm-castle-tower.ts:28` | `STORM_CASTLE_TOWER_ID`, `STORM_CASTLE_TOWER_CANVAS`, `STORM_CASTLE_TOWER_COLUMNS`, `STORM_CASTLE_TOWER_MOVE_STEP`, `STORM_CASTLE_TOWER_INITIAL_LIVES` | safe | No module imports this export. |
| export | `packages/game-cartridges/src/village-guardian.ts:28` | `VILLAGE_GUARDIAN_ID`, `VILLAGE_GUARDIAN_TRAIL_SPACING`, `VILLAGE_GUARDIAN_HIDE_DURATION_MS`, `VILLAGE_GUARDIAN_TIME_LIMIT_MS`, `VILLAGE_GUARDIAN_ACTIONS`, `getVillageGuardianDpadLayout` | safe | No module imports this export. |
| type | `packages/game-cartridges/src/abyssal-well.ts:183` | `AbyssalWellConfig`, `AbyssalWellActionResult`, `AbyssalWellController`, `AbyssalWellLabelLayout` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/alchemists-synthesis.ts:67` | `AlchemistsSynthesisOptions`, `AlchemistsSynthesisActionResult`, `AlchemistsSynthesisTimerResult`, `AlchemistsSynthesisController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/archers-revenge.ts:202` | `ArchersRevengeControllerOptions`, `ArchersRevengeAimResult`, `ArchersRevengeChooseResult`, `ArchersRevengeFireResult`, `ArchersRevengeArrowHit`, `ArchersRevengeTickResult`, `ArchersRevengeController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/astral-mage.ts:49` | `AstralMageCrystal`, `AstralMageCrystalPoint`, `AstralMagePhase`, `AstralMageSnapshot`, `AstralMageShotResult`, `AstralMageController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/castle-defense.ts:76` | `CastleDefenseRoutePoint` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/devourer-slime.ts:92` | `DevourerSlimeDirection`, `DevourerSlimeActionResult`, `DevourerSlimeTickResult`, `DevourerSlimeConfig`, `DevourerSlimeController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/dragon-flight.ts:63` | `DragonFlightGate`, `DragonFlightPhase`, `DragonFlightGateOptions`, `DragonFlightControllerOptions`, `DragonFlightSnapshot`, `DragonFlightChoiceResult`, `DragonFlightController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/griffin-sky-joust.ts:80` | `GriffinSkyJoustCollisionClass`, `GriffinSkyJoustControllerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/gryphon-patrol.ts:69` | `GryphonPatrolCompletionDelivery`, `GryphonPatrolPointerIntent`, `GryphonPatrolMovement`, `GryphonPatrolActionResult`, `GryphonPatrolFireResult`, `GryphonPatrolController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/haunted-library.ts:132` | `HauntedLibraryDpadButton`, `HauntedLibraryPhase`, `HauntedLibraryOutcome`, `HauntedLibraryEvent`, `HauntedLibraryControllerOptions`, `HauntedLibraryDoor`, `HauntedLibraryTrampoline`, `HauntedLibraryGhost`, `HauntedLibraryBat`, `HauntedLibraryPlayer`, `HauntedLibrarySnapshot`, `HauntedLibraryActionResult`, `HauntedLibraryController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/labyrinth-goblin-king.ts:32` | `LabyrinthCell`, `LabyrinthGoblin`, `LabyrinthGoblinKingSnapshot`, `LabyrinthGoblinKingController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/magic-defense.ts:178` | `MagicDefenseControllerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/astral-mage-map.ts:15` | `AstralMagePoint`, `AstralMageRect`, `AstralMagePath`, `AstralMageClearing`, `AstralMageTerrainLayer`, `AstralMageFeature`, `AstralMageMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/devourer-slime-map.ts:15` | `DevourerSlimePoint`, `DevourerSlimeRect`, `DevourerSlimePath`, `DevourerSlimeClearing`, `DevourerSlimeTerrainLayer`, `DevourerSlimeFeature`, `DevourerSlimeMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/dungeon-liberator-map.ts:14` | `DungeonLiberatorPoint`, `DungeonLiberatorRect`, `DungeonLiberatorPath`, `DungeonLiberatorClearing`, `DungeonLiberatorTerrainLayer`, `DungeonLiberatorFeature`, `DungeonLiberatorMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/enchanted-library-map.ts:15` | `EnchantedLibraryPoint`, `EnchantedLibraryRect`, `EnchantedLibraryPath`, `EnchantedLibraryClearing`, `EnchantedLibraryTerrainLayer`, `EnchantedLibraryFeature`, `EnchantedLibraryMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/labyrinth-goblin-king-map.ts:13` | `LabyrinthGoblinKingPoint`, `LabyrinthGoblinKingRect`, `LabyrinthGoblinKingFeature`, `LabyrinthGoblinKingClearing`, `LabyrinthGoblinKingTerrainLayer`, `LabyrinthGoblinKingMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/realm-carver-map.ts:15` | `RealmCarverPoint`, `RealmCarverRect`, `RealmCarverPath`, `RealmCarverClearing`, `RealmCarverTerrainLayer`, `RealmCarverFeature`, `RealmCarverMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/shadow-gate-dungeon-map.ts:14` | `ShadowGateDungeonPoint`, `ShadowGateDungeonRect`, `ShadowGateDungeonPath`, `ShadowGateDungeonClearing`, `ShadowGateDungeonTerrainLayer`, `ShadowGateDungeonFeature`, `ShadowGateDungeonMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/standard-play-map.ts:101` | `StandardPlayMapReachabilityOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/maps/village-guardian-map.ts:15` | `VillageGuardianPoint`, `VillageGuardianRect`, `VillageGuardianPath`, `VillageGuardianClearing`, `VillageGuardianTerrainLayer`, `VillageGuardianFeature`, `VillageGuardianMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/paladins-twin-soul.ts:75` | `PaladinsTwinSoulCompletionDelivery`, `PaladinsTwinSoulControllerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/potion-rush.ts:53` | `PotionRushPhase`, `PotionRushCauldronState`, `PotionRushCustomerState`, `PotionRushOutcome`, `PotionRushRequest`, `PotionRushIngredient`, `PotionRushCustomer`, `PotionRushCauldron`, `PotionRushSnapshot`, `PotionRushActionResult`, `PotionRushController`, `PotionRushControllerOptions`, `PotionRushPointerTarget` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/realm-carver.ts:36` | `RealmCarverCellState`, `RealmCarverPoint`, `RealmCarverWordSnapshot`, `RealmCarverMonsterSnapshot`, `RealmCarverPhase`, `RealmCarverOutcome`, `RealmCarverEvent`, `RealmCarverPlayerSnapshot`, `RealmCarverControllerOptions`, `RealmCarverSceneLayout`, `RealmCarverDpadGeometry` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/rpg-battle.ts:310` | `RpgBattleControllerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/rune-forge-chamber.ts:92` | `RuneForgeChamberRunePoint`, `RuneForgeChamberActionResult`, `RuneForgeChamberController`, `RuneForgeChamberControllerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/rune-match.ts:68` | `RuneMatchCell`, `VocabularyRune`, `PowerUpRune`, `Rune`, `GridPosition`, `RuneMatchGroup`, `MatchGroup`, `RuneMatchProcessedGroup`, `RuneMatchProcessResult`, `RuneMatchPhase`, `RuneMatchDirection`, `RuneMatchOutcome`, `RuneMatchOptions`, `RuneMatchPlayer`, `RuneMatchMonster`, `RuneMatchSnapshot`, `RuneMatchActionResult`, `RuneMatchController`, `RuneMatchBoardLayout` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/shadow-gate-dungeon.ts:62` | `ShadowGateCrystal`, `ShadowGateDungeonSnapshot`, `ShadowGateDungeonController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/sorcerer-ziggurat.ts:45` | `ZigguratDirection`, `ZigguratRuneOptions`, `SorcererZigguratPhase`, `SorcererZigguratSnapshot`, `SorcererZigguratStepResult`, `SorcererZigguratController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/spellweavers-run.ts:42` | `SpellweaversRunSnapshot`, `SpellweaversRunSelection`, `SpellweaversRunController` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/standard-experience.ts:18` | `CartridgeStandardExperienceOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/storm-castle-tower.ts:57` | `StormCastleTowerDirection`, `StormCastleTowerHazardType`, `StormCastleTowerPhase`, `StormCastleTowerPosition`, `StormCastleTowerWindow`, `StormCastleTowerHazard`, `StormCastleTowerSnapshot`, `StormCastleTowerActionResult`, `StormCastleTowerController`, `StormCastleTowerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/village-guardian.ts:126` | `VillageGuardianOptions`, `VillageGuardianDpadButton` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/wizard-graveyard-map.ts:14` | `WizardGraveyardPoint`, `WizardGraveyardRect`, `WizardGraveyardPath`, `WizardGraveyardClearing`, `WizardGraveyardTerrainLayer`, `WizardGraveyardMap` | safe | No module imports this type. |
| type | `packages/game-cartridges/src/wizard-zombie-behavior.ts:2` | `ZombiePursuitPoint`, `WizardZombieIntentInput`, `WizardZombieIntent` | safe | No module imports this type. |
| file | `packages/game-cartridges/scripts/export-play-map.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/game-cartridges/src/legacy-traversal-phase3-test-helpers.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/astral-mage-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/devourer-slime-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/dungeon-liberator-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/enchanted-library-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/labyrinth-goblin-king-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/realm-carver-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/shadow-gate-dungeon-map.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges/src/maps/village-guardian-map.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/game-cartridges/src/abyssal-well.ts:31` | `ABYSSAL_WELL_CANVAS`, `ABYSSAL_WELL_LANES`, `ABYSSAL_WELL_KEYBOARD_BINDINGS`, `createAbyssalWellState`, `startGame`, `rotatePlayer`, `fireProjectile`, `spawnEnemy`, `advanceAbyssalWellTime`, `applyAbyssalWellHazard`, `getLanePosition`, `getAbyssalWellLabelLayouts`, `chooseAbyssalWellActionFromPointer`, `getCreatureSpeed`, `getDifficultyConfig`, `calculateXP`, `createAbyssalWellController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/alchemists-synthesis.ts:34` | `ALCHEMISTS_SYNTHESIS_TIME_LIMIT_MS`, `ALCHEMISTS_SYNTHESIS_KEYBOARD_BINDINGS`, `createAlchemistsSynthesisController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/archers-revenge.ts:32` | `ARCHERS_REVENGE_CANVAS`, `ARCHERS_REVENGE_KEYBOARD_BINDINGS`, `clampArchersRevengeLabelX`, `getArchersRevengeColumnFromPointer`, `createArchersRevengeController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/astral-mage.ts:35` | `ASTRAL_MAGE_KEYBOARD_BINDINGS`, `createAstralMageController`, `getAstralMageCrystalPoints`, `chooseAstralMageCrystalFromPointer` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/castle-defense.ts:32` | `CASTLE_DEFENSE_KEYBOARD_BINDINGS`, `createCastleDefenseController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/challenge-capabilities.ts:12` | `CARTRIDGE_CHALLENGE_CAPABILITIES` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges/src/devourer-slime.ts:32` | `DEVOURER_SLIME_CANVAS`, `DEVOURER_SLIME_WORLD`, `INITIAL_SLIME_RADIUS`, `MAX_VISIBLE_SLIME_ORBS`, `KNIGHT_RADIUS`, `MAX_LIVES`, `DEFAULT_DEVOURER_SLIME_SEED`, `DEVOURER_SLIME_KEYBOARD_BINDINGS`, `DEVOURER_SLIME_AVAILABLE_ACTIONS`, `DEVOURER_SLIME_MAX_FRAME_DELTA_MS`, `directionFromPointerDelta`, `createDevourerSlimeController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/dragon-flight.ts:43` | `DRAGON_FLIGHT_GATE_TRAVEL_MS`, `createDragonFlightController`, `chooseGateFromPointer` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/dungeon-liberator.ts:27` | `DUNGEON_LIBERATOR_ID`, `DUNGEON_LIBERATOR_CANVAS`, `INVULNERABILITY_DURATION`, `DUNGEON_LIBERATOR_KEYBOARD_BINDINGS`, `getDungeonLiberatorDpadButtons`, `dungeonDirectionFromPointer`, `createDungeonLiberatorController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/enchanted-library.ts:29` | `ENCHANTED_LIBRARY_ID`, `ENCHANTED_LIBRARY_CANVAS`, `GAME_WIDTH`, `GAME_HEIGHT`, `PLAYER_RADIUS`, `BOOK_RADIUS`, `SPIRIT_RADIUS`, `INITIAL_MANA`, `MANA_GAIN_CORRECT`, `MANA_LOSS_INCORRECT`, `MANA_LOSS_SPIRIT_HIT`, `MAX_SHIELD_CHARGES`, `SHIELD_DURATION_MS`, `ENCHANTED_LIBRARY_DURATION_MS`, `SPIRIT_SPAWN_RATE_MS`, `PLAYER_SPEED`, `SPIRIT_SPEED`, `SHIELD_DURATION`, `GAME_DURATION_MS`, `ENCHANTED_LIBRARY_KEYBOARD_BINDINGS`, `ENCHANTED_LIBRARY_ACTIONS`, `calculateEnchantedLibraryShelfPlacements`, `calculateEnchantedLibraryXP`, `createEnchantedLibraryController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/existing-core-cutover-semantic-candidates.ts:393` | `PrematureConsumabilityError` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges/src/flight-parallax.ts:7` | `FLIGHT_PARALLAX_KEYS`, `hasFlightParallax` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/griffin-sky-joust.ts:37` | `GRIFFIN_SKY_JOUST_CANVAS`, `GRIFFIN_SKY_JOUST_KEYBOARD_BINDINGS`, `GRIFFIN_SKY_JOUST_INVULNERABILITY_MS`, `GRIFFIN_SKY_JOUST_MAX_ACTIVE_KNIGHTS`, `GRIFFIN_SKY_JOUST_SENTENCE_TRANSITION_MS`, `classifyGriffinSkyJoustCollision`, `createGriffinSkyJoustController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/gryphon-patrol.ts:43` | `GRYPHON_PATROL_WORLD`, `GRYPHON_PATROL_KEYBOARD_BINDINGS`, `chooseGryphonPatrolPointerIntent`, `createGryphonPatrolController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/haunted-library.ts:35` | `GAME_WIDTH`, `PLAYER_HEIGHT`, `INITIAL_LIVES`, `GRAVITY`, `JUMP_FORCE`, `TRAMPOLINE_FORCE`, `HAUNTED_LIBRARY_KEYBOARD_BINDINGS`, `getHauntedLibraryDpadLayout`, `chooseHauntedLibraryActionFromPointer`, `findNearestHauntedLibraryDoor`, `createHauntedLibraryController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/index.ts:4` | `createCatalogStandardEdition`, `listCatalogStandardArtDecisions`, `CARTRIDGE_CHALLENGE_CAPABILITIES`, `CANDIDATE_CLASSIFICATION`, `CANDIDATE_MATERIALIZATION`, `CANDIDATE_STATUS`, `EXISTING_CORE_CANDIDATE_PUBLIC_IDS`, `EXISTING_CORE_SEMANTIC_ADOPTION_CANDIDATES`, `PrematureConsumabilityError`, `UnmappedCandidateRoleStateError`, `assertCandidateNotConsumable`, `assertCandidateRoleStatesOwnerApproved`, `buildCandidateResolver`, `getExistingCoreSemanticAdoptionCandidate`, `getOwnerApprovedCanonicalBindings`, `materializeCandidateSelectedUnion`, `toSemanticAssetRequirements` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges/src/labyrinth-goblin-king.ts:23` | `LABYRINTH_ORB_COLOR`, `LABYRINTH_STEP_MS`, `LABYRINTH_AURA_MS`, `createLabyrinthGoblinKingController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/legacy-traversal-cartridges.ts:692` | `createDragonRiderCartridge`, `createSpellweaversRunCartridge`, `createShadowGateDungeonCartridge`, `createLabyrinthGoblinKingCartridge` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/magic-defense.ts:33` | `MAGIC_DEFENSE_MAX_CASTLE_HEALTH`, `MAGIC_DEFENSE_MAX_MANA`, `MAGIC_DEFENSE_MISSILE_SPAWN_INTERVAL_MS`, `MAGIC_DEFENSE_HORIZON_Y_RATIO`, `MAGIC_DEFENSE_TOWER_Y_RATIO`, `MAGIC_DEFENSE_CHOICE_Y_RATIO`, `MAGIC_DEFENSE_ENEMY_NEAR_SIZE`, `magicDefenseApproachPose`, `createMagicDefenseController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/maps/standard-play-map.ts:109` | `StandardPlayMapValidationError`, `validateStandardPlayMap` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/paladins-twin-soul.ts:33` | `PALADINS_TWIN_SOUL_CANVAS`, `PALADINS_TWIN_SOUL_KEYBOARD_BINDINGS`, `PALADINS_TWIN_SOUL_RULES`, `createPaladinsTwinSoulController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/potion-rush.ts:31` | `POTION_RUSH_CANVAS`, `POTION_RUSH_KEYBOARD_BINDINGS`, `getPotionRushPointerTarget`, `createPotionRushController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/realm-carver.ts:27` | `REALM_CARVER_GRID_SIZE`, `REALM_CARVER_AVAILABLE_ACTIONS`, `REALM_CARVER_KEYBOARD_BINDINGS`, `REALM_CARVER_MAX_VISIBLE_WORDS`, `getRealmCarverDpadGeometry`, `getRealmCarverSceneLayout`, `realmCarverDirectionFromPointer`, `createRealmCarverController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/rpg-battle.ts:30` | `RPG_BATTLE_CANVAS`, `RPG_BATTLE_PLAYER_MAX_HEALTH`, `RPG_BATTLE_SCORE_PER_CORRECT`, `RPG_BATTLE_BASIC_DAMAGE`, `RPG_BATTLE_POWER_DAMAGE`, `RPG_BATTLE_ENEMY_DAMAGE`, `RPG_BATTLE_FEEDBACK_LOCK_MS`, `rpgBattleChoiceRect`, `getRpgBattleChoiceIndex`, `createRpgBattleController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/rune-forge-chamber.ts:33` | `RUNE_FORGE_CHAMBER_KEYBOARD_BINDINGS`, `createRuneForgeChamberController`, `getRuneForgeChamberRunePoints`, `chooseRuneForgeChamberRuneFromPointer` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/rune-match.ts:42` | `RUNE_MATCH_ATTACK_INTERVAL_MS`, `RUNE_MATCH_KEYBOARD_BINDINGS`, `RUNE_MATCH_AVAILABLE_ACTIONS`, `areRuneCellsAdjacent`, `swapRunes`, `findRuneMatchGroups`, `initializeGrid`, `initializeEmptyGrid`, `findRuneMatchMove`, `findPossibleMoves`, `processMatches`, `calculateMatchDamage`, `createRuneMatchController`, `getRuneMatchBoardLayout`, `chooseRuneMatchCellFromPointer` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/shadow-gate-dungeon.ts:24` | `SHADOW_GATE_CRYSTAL_COLOR`, `SHADOW_GATE_EXIT`, `scaleShadowGatePoint`, `colorForShadowGateCrystal`, `wrapShadowGateCrystalLabel`, `createShadowGateDungeonController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/sorcerer-ziggurat.ts:35` | `SORCERER_ZIGGURAT_KEYBOARD_BINDINGS`, `createSorcererZigguratController`, `chooseZigguratDirectionFromPointer` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/spellweavers-run.ts:23` | `SPELLWEAVERS_RUN_ACTIONS`, `createSpellweaversRunController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/standard-experience.ts:11` | `STANDARD_POINTER_TOUCH_ACTION`, `STANDARD_DEBRIEF_CREDIT` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/storm-castle-tower.ts:43` | `STORM_CASTLE_TOWER_KEYBOARD_BINDINGS`, `getStormCastleTowerDirectionFromPointer`, `chooseStormCastleTowerDirectionFromPointer`, `createStormCastleTowerController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/village-guardian.ts:31` | `VILLAGE_GUARDIAN_CANVAS`, `VILLAGE_GUARDIAN_MOVE_STEP`, `VILLAGE_GUARDIAN_WRONG_TIME_PENALTY_MS`, `VILLAGE_GUARDIAN_INITIAL_LIVES`, `VILLAGE_GUARDIAN_KEYBOARD_BINDINGS`, `chooseVillageGuardianDirectionFromPointer`, `createVillageGuardianController` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/wizard-graveyard-map.ts:151` | `isPointInsideWizardGraveyardSolid`, `isWizardGraveyardPointReachable` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges/src/wizard-vs-zombie.ts:44` | `WIZARD_VS_ZOMBIE_ID`, `WIZARD_VS_ZOMBIE_CANVAS`, `GAME_WIDTH`, `GAME_HEIGHT`, `INITIAL_HP`, `MAX_SHOCKWAVE_CHARGES`, `INVULNERABILITY_DURATION`, `ANSWER_AUDIO_PROTECTION_DURATION`, `WIZARD_RADIUS`, `WIZARD_MOVE_SPEED`, `ORB_RADIUS`, `ZOMBIE_RADIUS`, `WIZARD_VS_ZOMBIE_KEYBOARD_BINDINGS`, `GRAVEYARD_FEATURES`, `GRAVEYARD_SOLIDS`, `WIZARD_ZOMBIE_SPAWN_GATES`, `hitsGraveyardSolid`, `findGraveyardRoute`, `getWizardShockwaveButtonBounds`, `getWizardListeningControlBounds`, `getWizardAnswerAudioControlBounds`, `getWizardArenaProjection`, `createWizardVsZombieController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/abyssal-well.ts:69` | `AbyssalWellDifficulty`, `CreatureType`, `AbyssalWellPhase`, `AbyssalWellOutcome`, `AbyssalWellPlayer`, `AbyssalWellEnemy`, `AbyssalWellProjectile`, `AbyssalWellState` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/alchemists-synthesis.ts:59` | `AlchemistsSynthesisOption`, `AlchemistsSynthesisPhase`, `AlchemistsSynthesisOutcome`, `AlchemistsSynthesisSnapshot` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/archers-revenge.ts:65` | `ArchersRevengePhase`, `ArchersRevengeEnemy`, `ArchersRevengeArrow`, `ArchersRevengeProjectile`, `ArchersRevengeTarget`, `ArchersRevengeSnapshot` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/castle-defense.ts:53` | `CastleDefensePhase`, `CastleDefenseWord`, `CastleDefenseEnemy`, `CastleDefenseTowerSlot`, `CastleDefenseTower`, `CastleDefenseBase`, `CastleDefensePlayer`, `CastleDefenseSnapshot`, `CastleDefenseActionResult`, `CastleDefenseController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/catalog-standard-art.ts:16` | `CatalogArtDecision`, `CatalogTitleArtDecision` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges/src/catalog.ts:4` | `CartridgeCatalogEntry`, `CartridgeId` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges/src/challenge-capabilities.ts:2` | `CartridgeChallengeCapability` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges/src/devourer-slime.ts:84` | `DevourerSlimePoint`, `DevourerSlimePhase`, `DevourerSlimeEvent`, `DevourerSlimeOrb`, `DevourerSlimeKnight`, `DevourerSlimeSnapshot` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/dungeon-liberator.ts:48` | `DungeonDirection`, `DungeonPoint`, `DungeonPrisoner`, `DungeonTrailSegment`, `DungeonMonster`, `DungeonPlayer`, `DungeonPortal`, `DungeonLiberatorPhase`, `DungeonLiberatorSnapshot`, `DungeonLiberatorControllerOptions`, `DungeonLiberatorActionResult`, `DungeonLiberatorController`, `DungeonDpadButton` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/enchanted-library.ts:109` | `EnchantedLibraryPoint`, `EnchantedLibraryDirection`, `EnchantedLibraryInput`, `EnchantedLibraryControllerOptions`, `EnchantedLibraryPlayer`, `EnchantedLibraryBook`, `EnchantedLibrarySpirit`, `EnchantedLibraryPhase`, `EnchantedLibraryEvent`, `EnchantedLibrarySnapshot`, `EnchantedLibraryActionResult`, `EnchantedLibraryController`, `EnchantedLibraryShelfPlacement` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/existing-core-cutover-qc.ts:91` | `ExistingCoreQcId`, `ExistingCoreQcInputModality`, `ExistingCoreQcInputIntent`, `ExistingCoreQcRegistryEntry`, `ExistingCoreQcManifest`, `ExistingCoreQcSessionSnapshot`, `ExistingCoreQcSession`, `ExistingCoreQcCartridge`, `ExistingCoreQcLoader` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges/src/griffin-sky-joust.ts:74` | `GriffinSkyJoustDirection`, `GriffinSkyJoustPhase`, `GriffinSkyJoustPlayer`, `GriffinSkyJoustKnight`, `GriffinSkyJoustSnapshot`, `GriffinSkyJoustActionResult`, `GriffinSkyJoustController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/gryphon-patrol.ts:75` | `GryphonPatrolPhase`, `GryphonPatrolPlayer`, `GryphonPatrolEnemy`, `GryphonPatrolOrb`, `GryphonPatrolProjectile`, `GryphonPatrolSnapshot` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/haunted-library.ts:124` | `HauntedLibraryAction` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/index.ts:8` | `CatalogArtDecision`, `CatalogTitleArtDecision`, `CartridgeChallengeCapability`, `CandidateEvidencePhase`, `CandidateInputMode`, `CandidateResolvedRoleState`, `CandidateRoleStateRequirement`, `CandidateTemporalScope`, `ExistingCoreCandidateSelectedUnion`, `ExistingCoreSemanticAdoptionCandidate` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges/src/labyrinth-goblin-king.ts:30` | `LabyrinthDirection`, `LabyrinthWordOrb` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/magic-defense.ts:54` | `MagicDefenseCastleId`, `MagicDefensePhase`, `MagicDefenseDefeatReason`, `MagicDefenseOutcome`, `MagicDefenseMissile`, `MagicDefenseCastleState`, `MagicDefenseSnapshot`, `MagicDefenseActionResult`, `MagicDefenseController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/paladins-twin-soul.ts:69` | `PaladinMovement`, `PaladinsTwinSoulPhase`, `PaladinsTwinSoulEnemySnapshot`, `PaladinsTwinSoulBulletSnapshot`, `PaladinsTwinSoulPlayerSnapshot`, `PaladinsTwinSoulSnapshot`, `PaladinsTwinSoulController`, `PaladinsTwinSoulChooseResult` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/realm-carver.ts:39` | `RealmCarverDirection`, `RealmCarverSnapshot`, `RealmCarverActionResult`, `RealmCarverController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/rpg-battle.ts:63` | `RpgBattlePhase`, `RpgBattleActor`, `RpgBattleTurn`, `RpgBattleActionPower`, `RpgBattleOutcome`, `RpgBattleAnswerResult`, `RpgBattleSnapshot`, `RpgBattleController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/rune-forge-chamber.ts:74` | `RuneForgeChamberRune`, `RuneForgeChamberPhase`, `RuneForgeChamberSnapshot` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/rune-match.ts:76` | `RuneMatchRune` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/village-guardian.ts:72` | `VillageGuardianPosition`, `VillageGuardianVillager`, `VillageGuardianTrailSegment`, `VillageGuardianMonster`, `VillageGuardianSanctuary`, `VillageGuardianPhase`, `VillageGuardianEvent`, `VillageGuardianOutcome`, `VillageGuardianSnapshot`, `VillageGuardianMoveAction`, `VillageGuardianActionResult`, `VillageGuardianController` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges/src/wizard-vs-zombie.ts:94` | `WizardVsZombieDirection`, `WizardVsZombiePhase`, `WizardVsZombiePoint`, `WizardVsZombieOrb`, `WizardVsZombieZombie`, `WizardVsZombieZombieSeed`, `WizardVsZombieControllerOptions`, `WizardVsZombieSnapshot`, `WizardVsZombieActionResult`, `WizardVsZombieController`, `WizardArenaProjection`, `WizardListeningControlBounds` | needs check | Only tests use this symbol. |
| file | `packages/game-cartridges/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/game-cartridges-3d

Safe 641, needs check 481, false positive 2, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/game-cartridges-3d/src/abyssal-well/core/content.ts:15` | `isSentenceInput`, `descentSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/evidence.ts:18` | `ABYSSAL_WELL_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/geometry.ts:30` | `headingOfDirection` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/index.ts:5` | `descentSentencesOf`, `isSentenceInput`, `ABYSSAL_WELL_GAME_ID`, `evidenceItemsOf`, `headingOfDirection` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/content.ts:14` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/evidence.ts:18` | `ALCHEMISTS_SYNTHESIS_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/index.ts:6` | `isVocabularyInput`, `choosable`, `ALCHEMISTS_SYNTHESIS_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/sim.ts:46` | `choosable` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/evidence.ts:17` | `ARCHERS_REVENGE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/index.ts:3` | `isVocabularyInput`, `distinctTerms`, `ARCHERS_REVENGE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/content.ts:15` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/evidence.ts:17` | `ASTRAL_MAGE_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/index.ts:7` | `isSentenceInput`, `castable`, `driftOf`, `ASTRAL_MAGE_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/sim.ts:69` | `driftOf`, `castable` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/content.ts:13` | `isSentenceInput`, `SENTENCE_WORDS`, `sentencesOf`, `waveSentencesOf`, `distractorsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/evidence.ts:17` | `CASTLE_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/index.ts:3` | `isSentenceInput`, `sentencesOf`, `waveSentencesOf`, `distractorsOf`, `SENTENCE_WORDS`, `CASTLE_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/content.ts:14` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/evidence.ts:17` | `DEVOURER_SLIME_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/index.ts:5` | `guardKindsOf`, `isSentenceInput`, `bubbleSpacingFor`, `DEVOURER_SLIME_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/sim.ts:108` | `bubbleSpacingFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/devourer-slime/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/evidence.ts:18` | `DRAGON_FLIGHT_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/index.ts:8` | `isVocabularyInput`, `gateCountFor`, `DRAGON_FLIGHT_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/sim.ts:65` | `gateCountFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/content.ts:12` | `isVocabularyInput`, `wordsOf`, `decoysFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/evidence.ts:17` | `DRAGON_RIDER_GAME_ID` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/index.ts:3` | `wordsOf`, `rideWordsOf`, `decoysFor`, `gatesFor`, `isVocabularyInput`, `DRAGON_RIDER_GAME_ID` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/types.ts:122` | `DRAGON_RIDER_EVENT_TYPES` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/content.ts:14` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/evidence.ts:18` | `DUNGEON_LIBERATOR_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/index.ts:5` | `isSentenceInput`, `villagerKindsOf`, `DUNGEON_LIBERATOR_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/content.ts:14` | `isVocabularyInput`, `normalTerm` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/evidence.ts:17` | `ENCHANTED_LIBRARY_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/index.ts:3` | `isVocabularyInput`, `normalTerm`, `SPIRIT_DOORS`, `ENCHANTED_LIBRARY_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/sim.ts:33` | `SPIRIT_DOORS` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/qc/bot.ts:11` | `DANGER` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/enchanted-library/view/hall.ts:17` | `BOOK_COLORS` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/content.ts:15` | `isSentenceInput`, `SENTENCE_WORDS`, `sentencesOf`, `escapeSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/evidence.ts:18` | `GRIFFIN_RIDERS_ESCAPE_GAME_ID`, `evidenceItemsOf`, `resultsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/index.ts:5` | `SENTENCE_WORDS`, `escapeOf`, `escapeSentencesOf`, `gatesFor`, `isSentenceInput`, `sentencesOf`, `stormLanesFor`, `wordPoolOf`, `nextWaveOf`, `GRIFFIN_RIDERS_ESCAPE_GAME_ID`, `evidenceItemsOf`, `resultsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/sim.ts:54` | `nextWaveOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/types.ts:139` | `ESCAPE_EVENT_TYPES` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/qc/bot.ts:10` | `wantedLane` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/view/land-plan.ts:12` | `PATTERN`, `kindOf`, `PROPS` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/content.ts:14` | `isSentenceInput`, `SENTENCE_WORDS`, `joustSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/evidence.ts:17` | `GRIFFIN_SKY_JOUST_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `joustSentencesOf`, `riderSpeedFor`, `targetWordOf`, `GRIFFIN_SKY_JOUST_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/sim.ts:70` | `riderSpeedFor`, `targetWordOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/view/scene.ts:14` | `PX_PER_M`, `WORLD_W` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/content.ts:15` | `isSentenceInput`, `SENTENCE_WORDS`, `patrolSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/evidence.ts:17` | `GRYPHON_PATROL_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `patrolSentencesOf`, `enemyCountFor`, `GRYPHON_PATROL_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/sim.ts:53` | `enemyCountFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/view/sky-plan.ts:8` | `GROUND_PROPS`, `rng` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/content.ts:14` | `isSentenceInput`, `ROOM_WORDS`, `roomSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/evidence.ts:17` | `HAUNTED_LIBRARY_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/index.ts:3` | `ROOM_WORDS`, `isSentenceInput`, `roomSentencesOf`, `visitOf`, `HAUNTED_LIBRARY_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/types.ts:153` | `LIBRARY_EVENT_TYPES` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/qc/bot.ts:10` | `REACH` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/view/library.ts:20` | `DOOR_SCALE` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/haunted-library/view2d/ground.ts:23` | `WALL_HEIGHT` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/evidence.ts:18` | `HERO_VS_ZOMBIE_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/index.ts:5` | `isVocabularyInput`, `HERO_START`, `orbCountFor`, `HERO_VS_ZOMBIE_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/sim.ts:46` | `HERO_START`, `orbCountFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/qc/bot.ts:19` | `LOOK_AHEAD`, `PREDICT_S`, `BLAST_RANGE`, `BLAST_ZOMBIES` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/content.ts:16` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/evidence.ts:18` | `LABYRINTH_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/index.ts:5` | `isSentenceInput`, `cloneMaze`, `LABYRINTH_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/types.ts:13` | `DIRS` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/view/geometry.ts:21` | `halfSize` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/labyrinth/view/maze.ts:17` | `WALL_HEIGHT` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/evidence.ts:17` | `MAGIC_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/index.ts:3` | `isVocabularyInput`, `distinctTerms`, `MAGIC_DEFENSE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/evidence.ts:17` | `TWIN_SOUL_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/index.ts:3` | `isVocabularyInput`, `TWIN_SOUL_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/content.ts:13` | `isSentenceInput`, `customerKindsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/evidence.ts:17` | `POTION_RUSH_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/index.ts:6` | `customerKindsOf`, `isSentenceInput`, `moodFor`, `patienceFor`, `beltSpeedFor`, `POTION_RUSH_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/sim.ts:112` | `moodFor`, `patienceFor`, `beltSpeedFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/qc/bot.ts:11` | `cauldronFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/potion-rush/view2d/game.ts:56` | `layoutFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/content.ts:14` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/evidence.ts:17` | `REALM_CARVER_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/index.ts:6` | `isSentenceInput`, `monsterKindsOf`, `cellsOf`, `REALM_CARVER_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/sim.ts:103` | `cellsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/realm-carver/view/geometry.ts:20` | `worldOfCell` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/content.ts:12` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/evidence.ts:17` | `RPG_BATTLE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/index.ts:3` | `isVocabularyInput`, `RPG_BATTLE_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rpg-battle/view/hud.ts:18` | `ACTION_LOOK` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/content.ts:15` | `isSentenceInput`, `BLADE_WORDS`, `bladeSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/evidence.ts:18` | `RUNE_FORGE_CHAMBER_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/index.ts:4` | `BLADE_WORDS`, `bladeSentencesOf`, `isSentenceInput`, `answerOf`, `choosable`, `RUNE_FORGE_CHAMBER_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/sim.ts:51` | `answerOf`, `choosable` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-match/core/content.ts:13` | `isVocabularyInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-match/core/evidence.ts:17` | `RUNE_MATCH_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-match/core/index.ts:4` | `isVocabularyInput`, `RUNE_MATCH_GAME_ID`, `evidenceItemsOf`, `scoreOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/rune-match/view/driver.ts:86` | `WORD_COLORS`, `HEAL_COLOR`, `SHIELD_COLOR` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/content.ts:15` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/evidence.ts:18` | `SHADOW_GATE_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/index.ts:7` | `isSentenceInput`, `SHADOW_GATE_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/qc/bot.ts:11` | `LOOK_AHEAD`, `PREDICT_S` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shared/battle/stage2d.ts:22` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/shared/battle/stage3d.ts:25` | `STAGES`, `vaultPlaces`, `buildVaultBackdrop` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/content.ts:15` | `isSentenceInput`, `RITUAL_WORDS`, `sentencesOf`, `ritualSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/evidence.ts:17` | `SORCERER_ZIGGURAT_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/index.ts:5` | `RITUAL_WORDS`, `isSentenceInput`, `ritualSentencesOf`, `sentencesOf`, `SORCERER_ZIGGURAT_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/view/ziggurat.ts:16` | `LANE_X`, `CUBE_WIDTH`, `STEP_Y`, `STEP_Z`, `FOOT_Z` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/view2d/ground.ts:16` | `LANE_X`, `STEP_Y`, `STEP_Z`, `FOOT_Z` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/content.ts:14` | `isSentenceInput`, `SENTENCE_WORDS`, `runSentencesOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/evidence.ts:17` | `SPELLWEAVERS_RUN_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/index.ts:4` | `SENTENCE_WORDS`, `isSentenceInput`, `runSentencesOf`, `laneCountFor`, `SPELLWEAVERS_RUN_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/sim.ts:50` | `laneCountFor` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/view/land-plan.ts:11` | `PATTERN` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/content.ts:15` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/evidence.ts:18` | `STORM_CASTLE_TOWER_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/index.ts:7` | `isSentenceInput`, `STORM_CASTLE_TOWER_GAME_ID`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/view/tower.ts:14` | `COLUMN_WIDTH`, `ROW_HEIGHT` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/view2d/tower.ts:16` | `COLUMN_WIDTH`, `ROW_HEIGHT`, `HALF_WALL` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/content.ts:14` | `isSentenceInput` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/evidence.ts:18` | `VILLAGE_GUARDIAN_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/index.ts:5` | `isSentenceInput`, `villagerKindsOf`, `VILLAGE_GUARDIAN_GAME_ID`, `SCORE`, `evidenceItemsOf` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/src/village-guardian/qc/bot.ts:18` | `LOOK_AHEAD`, `PREDICT_S` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/abyssal-well/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/alchemists-synthesis/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/astral-mage/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/castle-defense/helpers.ts:36` | `rightChoice` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/devourer-slime/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/dragon-flight/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/dragon-rider/helpers.ts:10` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/dungeon-liberator/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/enchanted-library/helpers.ts:16` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/griffin-riders-escape/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/griffin-sky-joust/helpers.ts:16` | `loadStory`, `runUntil` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/gryphon-patrol/helpers.ts:15` | `loadStory`, `aiming` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/haunted-library/helpers.ts:16` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/hero-vs-zombie/helpers.ts:16` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/potion-rush/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/realm-carver/helpers.ts:16` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/rune-forge-chamber/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/shadow-gate-dungeon/helpers.ts:17` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/shared/answer-audio-helpers.ts:8` | `ANSWER_AUDIO_SESSION` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/sorcerer-ziggurat/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/spellweavers-run/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/storm-castle-tower/helpers.ts:16` | `loadStory` | safe | No module imports this export. |
| export | `packages/game-cartridges-3d/tests/village-guardian/helpers.ts:15` | `loadStory` | safe | No module imports this export. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/content.ts:20` | `WellSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/index.ts:12` | `WellSentence`, `AbyssalWellOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/sim.ts:46` | `AbyssalWellOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/types.ts:117` | `AbyssalWellEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/abyssal-well/view/well.ts:17` | `WellScene` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/content.ts:19` | `WordSource`, `JarOption` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/index.ts:9` | `AlchemistsSynthesisInput`, `JarOption`, `WordSource`, `AlchemistsSynthesisOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/sim.ts:33` | `AlchemistsSynthesisOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/types.ts:102` | `AlchemistsSynthesisEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/view/lab.ts:19` | `Lab` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/core/index.ts:4` | `ArchersRevengeOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/core/sim.ts:35` | `ArchersRevengeOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/core/types.ts:112` | `ArchersRevengeEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/view/driver.ts:53` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/archers-revenge/view2d/game.ts:24` | `ArchersRevenge2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/content.ts:20` | `CastingSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/index.ts:11` | `AstralMageInput`, `CastingSentence`, `AstralMageOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/sim.ts:60` | `AstralMageOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/types.ts:127` | `AstralMageEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/astral-mage/view/circle.ts:15` | `Circle` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/core/content.ts:30` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/core/index.ts:3` | `SourceSentence`, `CastleDefenseOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/core/sim.ts:38` | `CastleDefenseOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/core/types.ts:151` | `CastleDefenseEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/view/driver.ts:78` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/castle-defense/view2d/game.ts:25` | `CastleDefense2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/content.ts:19` | `SentenceSource` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/index.ts:10` | `DevourerSlimeInput`, `SentenceSource`, `DevourerSlimeOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/sim.ts:92` | `DevourerSlimeOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/types.ts:133` | `DevourerSlimeEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/content.ts:18` | `WordSource` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/index.ts:10` | `WordSource`, `DragonFlightOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/sim.ts:55` | `DragonFlightOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/types.ts:130` | `DragonFlightEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-flight/view/land.ts:17` | `Land` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/content.ts:16` | `WordSource` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/evidence.ts:19` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/index.ts:3` | `WordSource`, `DragonRiderOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/sim.ts:43` | `DragonRiderOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/types.ts:119` | `DragonRiderEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dragon-rider/view/land.ts:14` | `Land` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/content.ts:19` | `ShiftSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/index.ts:10` | `DungeonLiberatorInput`, `ShiftSentence`, `DungeonLiberatorOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/sim.ts:92` | `DungeonLiberatorOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/types.ts:157` | `DungeonLiberatorEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/view/room.ts:13` | `Room` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/content.ts:19` | `LibraryWord` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/index.ts:3` | `LibraryInput`, `LibraryWord`, `EnchantedLibraryOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/sim.ts:77` | `EnchantedLibraryOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/types.ts:138` | `LibraryEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/enchanted-library/view/hall.ts:19` | `Hall` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/content.ts:20` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/index.ts:16` | `EscapeInput`, `SourceSentence`, `EscapeOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/sim.ts:46` | `EscapeOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/types.ts:136` | `EscapeEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/view/land-plan.ts:14` | `Kind`, `Placed` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/view/land.ts:18` | `Land` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/content.ts:19` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/index.ts:10` | `JoustInput`, `SourceSentence`, `JoustOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/sim.ts:58` | `JoustOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/types.ts:103` | `JoustEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/view/scene.ts:33` | `Sky` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/content.ts:20` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/index.ts:14` | `PatrolInput`, `SourceSentence`, `PatrolOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/sim.ts:45` | `PatrolOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/types.ts:164` | `PatrolEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/view/sky-plan.ts:33` | `Placed` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/view/sky.ts:13` | `Sky` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/content.ts:19` | `LibrarySentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/index.ts:3` | `LibraryInput`, `LibrarySentence`, `HauntedLibraryOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/sim.ts:69` | `HauntedLibraryOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/types.ts:150` | `LibraryEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/haunted-library/view/library.ts:29` | `Library` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/content.ts:18` | `WordSource`, `OrbOption` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/index.ts:10` | `OrbOption`, `WordSource`, `Grave`, `HeroVsZombieOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/sim.ts:49` | `Grave`, `HeroVsZombieOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/types.ts:183` | `HeroVsZombieEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/view/churchyard.ts:12` | `Churchyard` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/content.ts:21` | `StorySentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/index.ts:10` | `LabyrinthInput`, `StorySentence`, `LabyrinthOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/sim.ts:81` | `LabyrinthOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/types.ts:172` | `LabyrinthEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/view/geometry.ts:8` | `Ground`, `Piece`, `MazePieces`, `CameraFit` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/labyrinth/view/maze.ts:19` | `MazeSet`, `MazeOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/core/index.ts:4` | `MagicDefenseOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/core/sim.ts:42` | `MagicDefenseOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/core/types.ts:128` | `MagicDefenseEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/view/driver.ts:57` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/magic-defense/view2d/game.ts:24` | `MagicDefense2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/core/index.ts:4` | `TwinSoulOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/core/sim.ts:36` | `TwinSoulOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/core/types.ts:111` | `TwinSoulEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/view/driver.ts:68` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/paladins-twin-soul/view2d/game.ts:23` | `TwinSoul2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/content.ts:18` | `ShiftSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/index.ts:8` | `PotionRushInput`, `ShiftSentence`, `PotionRushOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/sim.ts:61` | `PotionRushOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/types.ts:154` | `PotionRushEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/view/shop.ts:23` | `Shop` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/potion-rush/view2d/game.ts:111` | `PotionRush2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/content.ts:19` | `CampaignSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/index.ts:10` | `CampaignSentence`, `RealmCarverInput`, `RealmCarverOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/sim.ts:64` | `RealmCarverOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/types.ts:173` | `RealmCarverEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/view/geometry.ts:10` | `Ground`, `CameraFit` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/realm-carver/view/realm.ts:18` | `Realm` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/core/index.ts:4` | `RpgBattleOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/core/sim.ts:53` | `RpgBattleOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/core/types.ts:126` | `RpgBattleEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/view/driver.ts:65` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/view/hud.ts:178` | `HeroId` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rpg-battle/view2d/game.ts:33` | `RpgBattle2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/content.ts:20` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/index.ts:12` | `RuneForgeChamberInput`, `SourceSentence`, `RuneForgeChamberOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/sim.ts:36` | `RuneForgeChamberOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/types.ts:108` | `RuneForgeChamberEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/view/forge.ts:18` | `Forge` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/core/index.ts:18` | `Line`, `RuneMatchOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/core/sim.ts:53` | `RuneMatchOptions`, `Line` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/core/types.ts:131` | `RuneMatchEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/view/driver.ts:75` | `PlayerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/rune-match/view2d/game.ts:23` | `RuneMatch2DTest` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/content.ts:20` | `DelveSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/index.ts:12` | `DelveSentence`, `ShadowGateInput`, `ShadowGateOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/sim.ts:81` | `ShadowGateOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/types.ts:128` | `ShadowGateEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/view/dungeon.ts:14` | `Dungeon` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shared/answer-audio.ts:25` | `AnswerAudioDriver` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shared/battle/stage2d.ts:40` | `PartyPlayer2D` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shared/battle/stage3d.ts:23` | `StageDef` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/shared/battle/vault-places.ts:4` | `Place` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/content.ts:20` | `ClimbSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/index.ts:13` | `ClimbSentence`, `ZigguratInput`, `ZigguratOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/sim.ts:23` | `ZigguratOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/types.ts:105` | `ZigguratEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/content.ts:19` | `SourceSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/evidence.ts:20` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/index.ts:12` | `SourceSentence`, `SpellweaversInput`, `SpellweaversOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/sim.ts:42` | `SpellweaversOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/types.ts:117` | `SpellweaversEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/view/land-plan.ts:13` | `Kind` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/view/land.ts:16` | `Land` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/content.ts:20` | `ClimbSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/index.ts:12` | `ClimbSentence`, `StormCastleTowerInput`, `StormCastleTowerOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/sim.ts:66` | `StormCastleTowerOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/types.ts:160` | `StormCastleTowerEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/content.ts:19` | `WatchSentence` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/evidence.ts:21` | `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/index.ts:10` | `VillageGuardianInput`, `WatchSentence`, `VillageGuardianOptions`, `EvidenceStory` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/sim.ts:100` | `VillageGuardianOptions` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/types.ts:166` | `VillageGuardianEventType` | safe | No module imports this type. |
| type | `packages/game-cartridges-3d/src/village-guardian/view/village.ts:16` | `Village` | safe | No module imports this type. |
| file | `packages/game-cartridges-3d/qc/main.ts:1` |  | needs check | Vite QC page; qc/index.html loads it. |
| file | `packages/game-cartridges-3d/qc/saved-items.ts:1` |  | needs check | Vite QC page; qc/index.html loads it. |
| file | `packages/game-cartridges-3d/scripts/port-game.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/game-cartridges-3d/src/archers-revenge/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges-3d/src/castle-defense/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges-3d/src/magic-defense/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges-3d/src/paladins-twin-soul/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges-3d/src/rpg-battle/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/game-cartridges-3d/src/rune-match/qc/bot.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/content.ts:29` | `DESCENT_WORDS`, `sentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/evidence.ts:41` | `evidenceOf`, `scoreOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/index.ts:4` | `DESCENT_WORDS`, `descentsOf`, `echoWordOf`, `normalWord`, `sentencesOf`, `TUNING`, `enemyInLane`, `evidenceOf`, `scoreOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/sim.ts:57` | `enemyInLane` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/abyssal-well/core/types.ts:120` | `ABYSSAL_WELL_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/content.ts:32` | `wordsOf`, `decoysFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/evidence.ts:66` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/index.ts:4` | `decoysFor`, `formulasOf`, `jarsFor`, `wordsOf`, `TUNING`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/sim.ts:20` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/core/types.ts:105` | `ALCHEMISTS_SYNTHESIS_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/alchemists-synthesis/manifest.ts:18` | `PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/content.ts:18` | `wordsOf`, `waveSizes` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/evidence.ts:36` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/index.ts:3` | `wordsOf`, `waveSizes`, `targetsOf`, `formationOf`, `roundOf`, `TUNING`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/sim.ts:21` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/archers-revenge/core/types.ts:115` | `ARCHERS_REVENGE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/archers-revenge/manifest.ts:12` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/content.ts:29` | `RITUAL_WORDS`, `sentencesOf`, `ritualSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/evidence.ts:23` | `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/index.ts:4` | `RITUAL_WORDS`, `castingOf`, `echoWordOf`, `normalWord`, `ritualSentencesOf`, `sentencesOf`, `TUNING`, `liveCrystalsOf`, `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/sim.ts:39` | `TUNING`, `liveCrystalsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/astral-mage/core/types.ts:130` | `ASTRAL_MAGE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/content.ts:18` | `WAVE_CONFIGS`, `HITS`, `bareWord`, `wordKey` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/evidence.ts:40` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/index.ts:3` | `shiftOf`, `bareWord`, `wordKey`, `attackersOf`, `choicesOf`, `WAVE_CONFIGS`, `HITS`, `TUNING`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/sim.ts:22` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/core/types.ts:154` | `CASTLE_DEFENSE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/castle-defense/manifest.ts:12` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/content.ts:22` | `ROUND_WORDS`, `sentencesOf`, `roundSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/evidence.ts:66` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/index.ts:4` | `ROUND_WORDS`, `roundSentencesOf`, `sentencesOf`, `shiftOf`, `SLIME_START`, `SPAWN_POINTS`, `guardCountFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/sim.ts:33` | `SLIME_START`, `SPAWN_POINTS`, `guardCountFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/devourer-slime/core/types.ts:136` | `DEVOURER_SLIME_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/devourer-slime/manifest.ts:25` | `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/content.ts:26` | `wordsOf`, `decoysFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/evidence.ts:63` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/index.ts:4` | `wordsOf`, `flightWordsOf`, `decoysFor`, `gatesFor`, `TUNING`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/sim.ts:27` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-flight/core/types.ts:133` | `DRAGON_FLIGHT_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-flight/manifest.ts:18` | `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/evidence.ts:22` | `evidenceItemsOf`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/index.ts:4` | `TUNING`, `bossPowerOf`, `evidenceItemsOf`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-rider/core/sim.ts:20` | `TUNING`, `bossPowerOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dragon-rider/manifest.ts:11` | `HERO_CLIPS_2D`, `DRAGON_CLIPS_2D`, `LAND_PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/content.ts:28` | `ROOM_WORDS`, `sentencesOf`, `roomSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/evidence.ts:70` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/index.ts:4` | `ROOM_WORDS`, `roomSentencesOf`, `sentencesOf`, `shiftOf`, `skeletonCountFor`, `skeletonSpeedFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/sim.ts:100` | `skeletonCountFor`, `skeletonSpeedFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/core/types.ts:160` | `DUNGEON_LIBERATOR_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/dungeon-liberator/manifest.ts:31` | `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/content.ts:26` | `DECOYS`, `wordsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/evidence.ts:23` | `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/index.ts:3` | `DECOYS`, `visitOf`, `decoysOf`, `wordsOf`, `TUNING`, `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/sim.ts:41` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/enchanted-library/core/types.ts:141` | `LIBRARY_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/content.ts:80` | `normWord` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/index.ts:4` | `LANES`, `nearestLane`, `normWord`, `rightLaneOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/core/sim.ts:59` | `rightLaneOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-riders-escape/manifest.ts:12` | `HERO_CLIPS_2D`, `GRIFFIN_CLIPS_2D`, `BAT_CLIPS_2D`, `LAND_PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/content.ts:31` | `sentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/evidence.ts:61` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/index.ts:6` | `joustOf`, `normWord`, `sentencesOf`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/core/types.ts:106` | `JOUST_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/griffin-sky-joust/manifest.ts:12` | `HERO_CLIPS_2D`, `GRIFFIN_CLIPS_2D`, `RIDER_CLIPS_2D`, `GROUND_PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/content.ts:35` | `sentencesOf`, `normWord` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/evidence.ts:61` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/index.ts:6` | `enemiesFor`, `enemyAt`, `normWord`, `patrolOf`, `sentencesOf`, `wordPoolOf`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/core/types.ts:167` | `PATROL_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/gryphon-patrol/manifest.ts:12` | `HERO_CLIPS_2D`, `GRYPHON_CLIPS_2D`, `BAT_CLIPS_2D`, `LAND_PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/content.ts:31` | `sentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/evidence.ts:63` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/index.ts:3` | `sentencesOf`, `ghostCountFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/haunted-library/core/sim.ts:77` | `ghostCountFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/content.ts:35` | `wordsOf`, `decoysFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/evidence.ts:63` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/index.ts:4` | `decoysFor`, `nightWordsOf`, `orbsFor`, `wordsOf`, `GRAVES`, `zombieCountFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/sim.ts:54` | `GRAVES`, `zombieCountFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/core/types.ts:186` | `HERO_VS_ZOMBIE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/hero-vs-zombie/manifest.ts:26` | `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/content.ts:24` | `SENTENCE_WORDS`, `sentencesOf`, `shiftSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/evidence.ts:65` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/index.ts:4` | `SENTENCE_WORDS`, `orbWordsOf`, `sentencesOf`, `shiftOf`, `shiftSentencesOf`, `MAZES`, `MAZE_COLS`, `MAZE_ROWS`, `canMove`, `cellsOf`, `inBounds`, `isCrossing`, `loopsOf`, `manhattan`, `mazeById`, `oppositeOf`, `parseMaze`, `wallsAt`, `TUNING`, `goblinCountFor`, `goblinSpeedFor`, `isLastSentence`, `COINS`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/mazes.ts:9` | `MAZE_COLS`, `MAZE_ROWS`, `inBounds`, `wallsAt`, `loopsOf`, `parseMaze` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/sim.ts:45` | `TUNING`, `isLastSentence`, `goblinCountFor`, `goblinSpeedFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/core/types.ts:175` | `LABYRINTH_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/labyrinth/manifest.ts:26` | `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/labyrinth/view/geometry.ts:37` | `edgeYaw` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/content.ts:18` | `wordsOf`, `waveSizes` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/evidence.ts:36` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/index.ts:3` | `wordsOf`, `waveSizes`, `targetsOf`, `formationOf`, `standingCastles`, `roundOf`, `TUNING`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/sim.ts:23` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/core/types.ts:131` | `MAGIC_DEFENSE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/magic-defense/manifest.ts:12` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/content.ts:18` | `wordsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/evidence.ts:36` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/index.ts:3` | `wordsOf`, `targetsOf`, `shadesOf`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/core/types.ts:114` | `TWIN_SOUL_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/paladins-twin-soul/manifest.ts:11` | `HERO_CLIPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/content.ts:27` | `sentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/evidence.ts:66` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/index.ts:4` | `ordersOf`, `sentencesOf`, `TUNING`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/sim.ts:23` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/potion-rush/core/types.ts:157` | `POTION_RUSH_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/potion-rush/manifest.ts:29` | `INGREDIENTS_2D`, `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/content.ts:28` | `REALM_WORDS`, `sentencesOf`, `realmSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/evidence.ts:64` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/index.ts:4` | `REALM_WORDS`, `campaignOf`, `realmSentencesOf`, `sentencesOf`, `dirOfSteer`, `monsterCountFor`, `monsterIntervalFor`, `wildCount`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/sim.ts:72` | `monsterCountFor`, `monsterIntervalFor`, `dirOfSteer`, `wildCount` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/realm-carver/core/types.ts:176` | `REALM_CARVER_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/registry.ts:78` | `GAMES`, `GAME_STRINGS`, `playable`, `missingItems`, `gameById` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/content.ts:17` | `wordsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/evidence.ts:36` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/index.ts:3` | `wordsOf`, `targetsOf`, `optionsOf`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rpg-battle/core/types.ts:129` | `RPG_BATTLE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rpg-battle/manifest.ts:11` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/content.ts:30` | `WAVE_RUNES`, `sentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/evidence.ts:65` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/index.ts:5` | `WAVE_RUNES`, `forgeOf`, `normalWord`, `sentencesOf`, `waveWordsOf`, `TUNING`, `orbitPoint`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/sim.ts:25` | `TUNING`, `orbitPoint` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/core/types.ts:111` | `RUNE_FORGE_CHAMBER_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-forge-chamber/manifest.ts:18` | `PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/rune-match/core/content.ts:18` | `wordsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-match/core/evidence.ts:36` | `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-match/core/index.ts:5` | `wordsOf`, `targetsOf`, `paletteOf`, `keyOf`, `isNeighbor`, `findLines`, `findTargetMove`, `evidenceOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-match/core/sim.ts:69` | `keyOf`, `isNeighbor`, `findLines`, `findTargetMove` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-match/core/types.ts:134` | `RUNE_MATCH_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/rune-match/manifest.ts:11` | `HERO_CLIPS_2D`, `ENEMY_CLIPS_2D`, `MODELS_3D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/content.ts:29` | `ROOM_WORDS`, `roomSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/evidence.ts:70` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/index.ts:4` | `ROOM_WORDS`, `bareWord`, `distractorsOf`, `roomSentencesOf`, `sentencesOf`, `shiftOf`, `wordKey`, `shadowCountFor`, `shadowSpeedFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/sim.ts:87` | `shadowCountFor`, `shadowSpeedFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/types.ts:131` | `SHADOW_GATE_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shared/battle/stage2d.ts:19` | `HEROES`, `battleFiles2D` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shared/battle/stage3d.ts:31` | `vaultModels` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/shared/challenge.ts:9` | `APK_INPUT_ID` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/content.ts:32` | `DECOYS`, `normalWord`, `cubeWord` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/evidence.ts:23` | `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/index.ts:4` | `DECOYS`, `climbOf`, `cubeWord`, `cubesOf`, `normalWord`, `TUNING`, `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/sim.ts:14` | `TUNING` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/types.ts:108` | `ZIGGURAT_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/content.ts:31` | `sentencesOf`, `normWord` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/evidence.ts:61` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/index.ts:6` | `normWord`, `orbsFor`, `runOf`, `sentencesOf`, `wordPoolOf`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/core/types.ts:120` | `SPELLWEAVERS_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/spellweavers-run/manifest.ts:12` | `HERO_CLIPS_2D`, `ROAD_PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/content.ts:29` | `TOWER_WORDS`, `towerSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/evidence.ts:24` | `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/index.ts:4` | `TOWER_WORDS`, `bareWord`, `distractorsOf`, `sentencesOf`, `shiftOf`, `towerSentencesOf`, `wordKey`, `START`, `TUNING`, `summitRowFor`, `windowRowFor`, `SCORE`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/sim.ts:26` | `START`, `TUNING`, `windowRowFor`, `summitRowFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/core/types.ts:163` | `STORM_CASTLE_TOWER_EVENT_TYPES` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/storm-castle-tower/manifest.ts:15` | `PROPS_2D` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/content.ts:28` | `VILLAGE_WORDS`, `sentencesOf`, `villageSentencesOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/evidence.ts:70` | `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/index.ts:4` | `VILLAGE_WORDS`, `villageSentencesOf`, `sentencesOf`, `watchOf`, `goblinCountFor`, `threatCountFor`, `threatSpeedFor`, `resultsOf` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/sim.ts:108` | `threatCountFor`, `goblinCountFor`, `threatSpeedFor` | needs check | Only tests use this symbol. |
| export | `packages/game-cartridges-3d/src/village-guardian/core/types.ts:169` | `VILLAGE_GUARDIAN_EVENT_TYPES` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/index.ts:14` | `AbyssalWellSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/abyssal-well/core/sim.ts:44` | `AbyssalWellSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/index.ts:19` | `AlchemistsSynthesisSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/alchemists-synthesis/core/sim.ts:31` | `AlchemistsSynthesisSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/index.ts:24` | `AstralMageSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/astral-mage/core/sim.ts:58` | `AstralMageSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/index.ts:24` | `DevourerSlimeSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/devourer-slime/core/sim.ts:97` | `DevourerSlimeSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/index.ts:18` | `DragonFlightSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dragon-flight/core/sim.ts:62` | `DragonFlightSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/index.ts:4` | `DragonRiderSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dragon-rider/core/sim.ts:49` | `DragonRiderSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/index.ts:23` | `DungeonLiberatorSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/dungeon-liberator/core/sim.ts:97` | `DungeonLiberatorSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/index.ts:14` | `EnchantedLibrarySimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/enchanted-library/core/sim.ts:75` | `EnchantedLibrarySimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/index.ts:25` | `EscapeSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/griffin-riders-escape/core/sim.ts:51` | `EscapeSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/index.ts:22` | `JoustSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/griffin-sky-joust/core/sim.ts:63` | `JoustSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/index.ts:23` | `PatrolSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/gryphon-patrol/core/sim.ts:50` | `PatrolSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/index.ts:12` | `HauntedLibrarySimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/haunted-library/core/sim.ts:74` | `HauntedLibrarySimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/index.ts:26` | `HeroVsZombieSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/hero-vs-zombie/core/sim.ts:121` | `HeroVsZombieSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/index.ts:44` | `LabyrinthSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/labyrinth/core/sim.ts:88` | `LabyrinthSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/index.ts:20` | `PotionRushSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/potion-rush/core/sim.ts:66` | `PotionRushSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/index.ts:25` | `RealmCarverSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/realm-carver/core/sim.ts:69` | `RealmCarverSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/registry.ts:66` | `GameEntry` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/index.ts:25` | `RuneForgeChamberSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/rune-forge-chamber/core/sim.ts:34` | `RuneForgeChamberSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/rune-match/view/driver.ts:23` | `BoardCell` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/index.ts:25` | `ShadowGateSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/shadow-gate-dungeon/core/sim.ts:79` | `ShadowGateSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/index.ts:16` | `ZigguratSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/sorcerer-ziggurat/core/sim.ts:21` | `ZigguratSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/index.ts:21` | `SpellweaversSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/spellweavers-run/core/sim.ts:47` | `SpellweaversSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/index.ts:25` | `StormCastleTowerSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/storm-castle-tower/core/sim.ts:64` | `StormCastleTowerSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/index.ts:24` | `VillageGuardianSimulation` | needs check | Only tests use this symbol. |
| type | `packages/game-cartridges-3d/src/village-guardian/core/sim.ts:105` | `VillageGuardianSimulation` | needs check | Only tests use this symbol. |
| file | `packages/game-cartridges-3d/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `packages/game-cartridges-3d/qc/vite.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/game-contracts

Safe 0, needs check 0, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/game-contracts/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/integrations/github

Safe 1, needs check 14, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| type | `packages/integrations/github/src/drivers/rest.ts:13` | `GitHubRestConfig` | safe | No module imports this type. |
| export | `packages/integrations/github/src/factory.ts:21` | `createGitHubClient` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/integrations/github/src/index.ts:8` | `GitHubClientError`, `githubConfigSchema`, `GitHubRestDriver`, `createGitHubClient`, `getGitHubClient`, `resetGitHubClient`, `GitHubNotConfiguredError` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/integrations/github/src/client.ts:89` | `GitHubConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/integrations/github/src/index.ts:2` | `GitHubClient`, `GitHubConfig`, `PracticeIssue`, `Repository`, `ListIssuesOptions` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/integrations/github/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/knowledge-space-core

Safe 9, needs check 28, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/knowledge-space-core/src/srs-bridge.ts:21` | `stabilityToRetention` | safe | No module imports this export. |
| export | `packages/knowledge-space-core/src/transfer-eligibility.ts:349` | `aggregateComponentMastery`, `resolveEquivalenceComponent`, `TRANSFER_POLICY_DEFAULT`, `transferPolicySchema` | safe | No module imports this export. |
| type | `packages/knowledge-space-core/src/edge-endpoint-rules.ts:11` | `EdgeSourceTargetConstraint` | safe | No module imports this type. |
| type | `packages/knowledge-space-core/src/placement-fixtures.ts:268` | `DeterministicProbeAdapter`, `DeterministicProbeAdapterOptions`, `MockPlacementResultOverrides` | safe | No module imports this type. |
| file | `packages/knowledge-space-core/src/placement-fixtures.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/knowledge-space-core/src/progress-trend.ts:75` | `computeProgressTrend` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-core/src/schemas.ts:52` | `sourceRefSchema`, `sourceRefsSchema`, `exceptionSchema`, `knowledgeSpaceNodeSchema`, `knowledgeSpaceEdgeSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/adapters.ts:5` | `DomainAdapter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/cross-course-equivalence.ts:13` | `CrossCourseCourse`, `CrossCourseInput`, `CrossCourseValidationResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/edge-suggestions.ts:13` | `EdgeSuggestionInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/level-projection.ts:62` | `DisplayLevelBand` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/placement-engine.ts:26` | `TraversalOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/placement.ts:137` | `BuildSeedOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/progress-trend.ts:52` | `MasterySnapshot`, `ProgressTrend`, `ComputeProgressTrendOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/srs-bridge.ts:122` | `ConvertArgs` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/transfer-credit.ts:63` | `TransferCreditResult`, `BatchTransferCreditResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/transfer-skip.ts:97` | `ConfirmationCheck` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/transfer-teacher-audit.ts:117` | `TransferCreditStudentMap`, `TransferCreditCourseMap` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/types.ts:35` | `ExceptionType` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/validation.ts:150` | `PrerequisiteCycle`, `CycleDetectionOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-core/src/weighted-readiness.ts:17` | `ReadinessResult` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/knowledge-space-core/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/knowledge-space-practice

Safe 9, needs check 229, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/knowledge-space-practice/src/blueprints/generator.ts:1` |  | safe | No import, script, or config reaches this file. |
| export | `packages/knowledge-space-practice/src/__tests__/progressTrendFixtures.ts:24` | `PROGRESS_TREND_WINDOW_MS` | safe | No module imports this export. |
| type | `packages/knowledge-space-practice/src/__tests__/planner-fixtures.ts:112` | `MakeChainOptions`, `MakeTreeOptions`, `MakeCyclicOptions`, `MakeDisconnectedOptions`, `MakePlannerGraphOptions` | safe | No module imports this type. |
| type | `packages/knowledge-space-practice/src/__tests__/progressTrendFixtures.ts:114` | `MasterySnapshot`, `ProgressTrendHistory` | safe | No module imports this type. |
| export | `packages/knowledge-space-practice/src/blueprints/index.ts:24` | `variantParameterSchema`, `gradingRuleSchema`, `workedStepSchema`, `workedExampleSpecSchema`, `guidedPracticeSpecSchema`, `independentPracticeSpecSchema`, `gradingSpecSchema`, `knowledgeBlueprintSchema`, `generatorInputSchema`, `gradingMetadataSchema`, `generatorOutputSchema`, `generatorRegistrySchema`, `genericEvidencePartSchema`, `genericEvidenceResultSchema`, `validateGeneratorOutput`, `validateBlueprintGeneratorReadiness`, `validateRendererCompatibility`, `validateModeSupport`, `validateGradingCompatibility`, `genericEvidenceToSubmissionParts`, `syntheticAlgebraicBlueprint`, `syntheticGraphingBlueprint`, `syntheticEnglishBlueprint`, `syntheticGeneratorOutput` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/blueprints/schemas.ts:16` | `variantParameterSchema`, `gradingRuleSchema`, `workedStepSchema`, `independentPracticeSpecSchema`, `gradingSpecSchema`, `gradingMetadataSchema`, `generatorRegistrySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/index.ts:26` | `misconceptionSeveritySchema`, `misconceptionLifecycleStatusSchema`, `studentMisconceptionStateSchema`, `getMisconceptionSeverity`, `runRealT6Loop`, `variantParameterSchema`, `gradingRuleSchema`, `workedStepSchema`, `workedExampleSpecSchema`, `guidedPracticeSpecSchema`, `independentPracticeSpecSchema`, `gradingSpecSchema`, `knowledgeBlueprintSchema`, `generatorInputSchema`, `gradingMetadataSchema`, `generatorOutputSchema`, `generatorRegistrySchema`, `genericEvidencePartSchema`, `genericEvidenceResultSchema`, `validateGeneratorOutput`, `validateBlueprintGeneratorReadiness`, `validateRendererCompatibility`, `validateModeSupport`, `validateGradingCompatibility`, `genericEvidenceToSubmissionParts`, `syntheticAlgebraicBlueprint`, `syntheticGraphingBlueprint`, `syntheticEnglishBlueprint`, `syntheticGeneratorOutput`, `projectActivityMap`, `projectSrsInputs`, `projectTeacherEvidence`, `projectStudentVisualization`, `projectParentVisualization`, `projectTeacherVisualization`, `syntheticMathKnowledgeSpace`, `syntheticEnglishGseKnowledgeSpace`, `syntheticBlueprint`, `syntheticLearnerState`, `visualNodeV1Schema`, `visualEdgeV1Schema`, `studentVisualizationV1Schema`, `parentVisualizationV1Schema`, `teacherVisualizationV1Schema`, `planRemediationInjection`, `getPriority`, `computePriorities`, `computeUnlockValues`, `getUnlockValue`, `getRecommendedNext`, `planRecommendedNext`, `recommendationPolicySchema`, `evaluateDomainUtility`, `utilitySignalSchema`, `domainUtilityProviderIdentitySchema`, `domainUtilityValueSchema`, `computePrerequisiteDensity`, `computeUtilityLedScore`, `projectReviewLoad`, `utilityLedTermsSchema`, `reviewLoadInputSchema`, `priorityWeightsSchema`, `DEFAULT_PRIORITY_WEIGHTS` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/planner/domain-utility.ts:31` | `utilitySignalSchema`, `domainUtilityProviderIdentitySchema`, `domainUtilityValueSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/planner/recommended-next.ts:41` | `recommendationPolicySchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/planner/review-load.ts:44` | `utilityLedTermsSchema`, `reviewLoadInputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/planner/weakness-fit.ts:32` | `computeWeaknessFitMap` | needs check | Only tests use this symbol. |
| export | `packages/knowledge-space-practice/src/projections/activity-map.ts:30` | `findChildSkills`, `selectSkill` | needs check | Only tests use this symbol. |
| export | `packages/knowledge-space-practice/src/projections/fixtures.ts:7` | `syntheticMathKnowledgeSpace`, `syntheticEnglishGseKnowledgeSpace` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/projections/index.ts:23` | `visualNodeV1Schema`, `visualEdgeV1Schema`, `studentVisualizationV1Schema`, `parentVisualizationV1Schema`, `teacherVisualizationV1Schema`, `projectActivityMap`, `projectSrsInputs`, `projectTeacherEvidence`, `projectStudentVisualization`, `projectParentVisualization`, `projectTeacherVisualization`, `syntheticMathKnowledgeSpace`, `syntheticEnglishGseKnowledgeSpace`, `syntheticBlueprint`, `syntheticEnglishBlueprintProjection`, `syntheticLearnerState` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/knowledge-space-practice/src/projections/schemas.ts:7` | `visualNodeV1Schema`, `visualEdgeV1Schema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/blueprints/index.ts:6` | `WorkedStep`, `VariantParameter`, `GradingSpec`, `GradingRule`, `GeneratorInput`, `GeneratorOutput`, `GradingMetadata`, `GenericEvidencePart`, `GenericEvidenceResult`, `DeterministicGenerator`, `SchemaAdapter`, `ValidationResult`, `ValidationError`, `EvidenceAdapter`, `PracticeSubmissionPart` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/index.ts:4` | `KnowledgeBlueprint`, `WorkedExampleSpec`, `WorkedStep`, `GuidedPracticeSpec`, `IndependentPracticeSpec`, `VariantParameter`, `GradingSpec`, `GradingRule`, `GeneratorInput`, `GeneratorOutput`, `GradingMetadata`, `GenericEvidencePart`, `GenericEvidenceResult`, `DeterministicGenerator`, `SchemaAdapter`, `ValidationResult`, `ValidationError`, `EvidenceAdapter`, `PracticeSubmissionPart`, `MisconceptionSeverity`, `MisconceptionLifecycleStatus`, `StudentMisconceptionState`, `StudentMisconceptionLoopState`, `RunRealT6LoopInput`, `RunRealT6LoopOutput`, `PlannedActivity`, `PlanRemediationInjectionInput`, `RecommendationPolicy`, `PlanRecommendedNextInput`, `PlanRecommendedNextResult`, `UtilitySignal`, `DomainUtilityValue`, `DomainUtilityProvider`, `EvaluatedDomainUtility`, `DensityNode`, `DensityEdge`, `PrerequisiteDensityResult`, `UtilityLedTerms`, `ReviewLoadInput`, `ReviewLoadProjection`, `PriorityWeights`, `PriorityWeightInput`, `PriorityScoreTerms`, `PriorityScore`, `PlannerNodeView`, `PlannerEdgeView`, `PlannerMisconceptionLink`, `PlannerInput`, `PlannerOutput`, `ProjectedActivity`, `SrsProjectionEntry`, `TeacherEvidence`, `StandardCoverage`, `SkillCoverage`, `PrerequisiteGap`, `AttemptArtifact`, `EquivalentComponentSummary`, `VisualNodeV1`, `VisualEdgeV1`, `StudentVisualizationV1`, `ParentVisualizationV1`, `TeacherHeatmapCell`, `InterventionGroup`, `TeacherVisualizationV1` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/misconception-loop.ts:27` | `MisconceptionLifecycleStatus` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/planner/domain-utility.ts:4` | `UtilitySignal` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/planner/injection.ts:10` | `PlannedActivity`, `PlanRemediationInjectionInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/planner/recommended-next.ts:52` | `RecommendationPolicy`, `PlanRecommendedNextInput`, `PlanRecommendedNextResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/planner/review-load.ts:4` | `DensityNode`, `DensityEdge`, `UtilityLedTerms` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/projections/index.ts:4` | `KnowledgeBlueprint`, `ProjectedActivity`, `SrsProjectionEntry`, `TeacherEvidence`, `StandardCoverage`, `SkillCoverage`, `PrerequisiteGap`, `AttemptArtifact`, `EquivalentComponentSummary`, `VisualNodeV1`, `VisualEdgeV1`, `StudentVisualizationV1`, `ParentVisualizationV1`, `TeacherHeatmapCell`, `InterventionGroup`, `TeacherVisualizationV1` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/knowledge-space-practice/src/projections/types.ts:150` | `KnowledgeBlueprint` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/knowledge-space-practice/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/mastery-runtime-compat

Safe 0, needs check 27, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/mastery-runtime-compat/fixtures/consumer/check-consumer.mjs:1` |  | needs check | Test, fixture, or snapshot no runner config picks up. |
| export | `packages/mastery-runtime-compat/src/check-consumer.ts:27` | `runConsumerCompatibilityGateFromPath` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/mastery-runtime-compat/src/index.ts:39` | `SalesKnowledgeIdentitySchema`, `RuntimeAuthoritySchema`, `RuntimeOwnershipSchema`, `RuntimePackageSchema`, `RuntimeReleaseSetSchema`, `RuntimeManifestSchema`, `ConsumerDescriptorSchema`, `parseRuntimeManifest`, `evaluateRuntimeCompatibility`, `runConsumerCompatibilityGate`, `runConsumerCompatibilityGateFromPath`, `runSyntheticCodecampProof`, `runReleaseArtifactCheck` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/mastery-runtime-compat/src/release-artifact.ts:390` | `createNpmOperationSchedulerForTest`, `createWorkspaceLeaseRuntimeForTest`, `normalizePublishManifestForRelease`, `assertExportTargets` | needs check | Only tests use this symbol. |
| type | `packages/mastery-runtime-compat/src/index.ts:311` | `RuntimeManifest`, `RuntimeReleaseSet`, `ConsumerDescriptor`, `SyntheticCodecampProofResult`, `ReleaseArtifactCheckResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/mastery-runtime-compat/src/release-artifact.ts:190` | `ReleaseSalesKnowledgeIdentity`, `ReleaseArtifactCheckOptions`, `NpmOperationSchedulerProbe` | needs check | Only tests use this symbol. |
| file | `packages/mastery-runtime-compat/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/practice-core

Safe 11, needs check 126, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/practice-core/src/generator-qa/__tests__/fixtures/numericOracle.ts:48` | `expectedPropertyFailureMessage` | safe | No module imports this export. |
| type | `packages/practice-core/src/generator-qa/__tests__/fixtures/badGenerators.ts:13` | `BadGeneratorInput`, `BadGenerator` | safe | No module imports this type. |
| type | `packages/practice-core/src/generator-qa/__tests__/fixtures/numericOracle.ts:15` | `NumericOracle` | safe | No module imports this type. |
| type | `packages/practice-core/src/generator-qa/__tests__/fixtures/seedCorpus.ts:41` | `SeedIterationContext` | safe | No module imports this type. |
| type | `packages/practice-core/src/generator-qa/__tests__/fixtures/stubGenerator.ts:13` | `StubGeneratorInput`, `StubGeneratorOutput`, `StubGenerator` | safe | No module imports this type. |
| type | `packages/practice-core/src/generator-qa/__tests__/fixtures/wellFormedGenerator.ts:13` | `WellFormedGeneratorInput`, `WellFormedGenerator` | safe | No module imports this type. |
| type | `packages/practice-core/src/practice/fixtures.ts:24` | `MockPracticeEnvelopeOverrides` | safe | No module imports this type. |
| file | `packages/practice-core/src/generator-qa/gate.ts:1` |  | needs check | Only tests import this file. |
| export | `packages/practice-core/src/generator-qa/contract.ts:4` | `GENERATOR_CORRECTNESS_CONTRACT_VERSION` | needs check | Only tests use this symbol. |
| export | `packages/practice-core/src/index.ts:2` | `PRACTICE_CONTRACT_VERSION`, `PRACTICE_MODE_VALUES`, `PRACTICE_SUBMISSION_STATUS_VALUES`, `practiceModeSchema`, `practiceSubmissionStatusSchema`, `practiceTimingConfidenceSchema`, `practiceTimingSummarySchema`, `convexActivityIdSchema`, `toConvexActivityId`, `practiceSubmissionEnvelopeSchema`, `isPracticeSubmissionEnvelope`, `buildPracticeSubmissionParts`, `buildPracticeSubmissionEnvelope`, `normalizePracticeSubmissionInput`, `PracticeTimingConfidenceSchema`, `PracticeTimingSummarySchema`, `PracticeSubmissionPartSchema`, `PracticeSubmissionEnvelopeSchema`, `DEFAULT_IDLE_THRESHOLD_MS`, `TimingAccumulator`, `createTimingAccumulator`, `TIMING_BASELINE_MIN_SAMPLES`, `SPEED_BAND_THRESHOLDS`, `computeBaseRating`, `applyTimingToRating`, `DIFFICULTY_VALUES`, `difficultySchema`, `practiceVariantSchema`, `problemFamilySchema`, `practiceItemSchema`, `canTeacherAccessSubmission`, `canTeacherAccessLessonSummary`, `aggregateMisconceptionTags`, `summarizePartOutcomes`, `buildStudentProfiles`, `buildDeterministicSummary`, `generateAISummary`, `buildTeacherErrorView`, `createMockPracticeEnvelope`, `createMockPracticeTimingSummary`, `createMockPracticeSubmissionPart` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/practice-core/src/practice/error-analysis/index.ts:132` | `canTeacherAccessSubmission`, `canTeacherAccessLessonSummary`, `aggregateMisconceptionTags`, `summarizePartOutcomes`, `buildStudentProfiles`, `buildDeterministicSummary`, `generateAISummary`, `buildTeacherErrorView` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/practice-core/src/practice/fixtures.ts:66` | `createMockPracticeTimingSummary`, `createMockPracticeSubmissionPart` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/practice-core/src/practice/fixtures.ts:109` | `PRACTICE_CONTRACT_VERSION` | needs check | Only tests use this symbol. |
| export | `packages/practice-core/src/practice/problem-family.ts:3` | `DIFFICULTY_VALUES`, `difficultySchema`, `practiceVariantSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/practice-core/src/practice/submission.schema.ts:3` | `PracticeTimingConfidenceSchema`, `PracticeTimingSummarySchema`, `PracticeSubmissionPartSchema`, `PracticeSubmissionEnvelopeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/practice-core/src/practice/timing.ts:129` | `TimingAccumulator` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/index.ts:8` | `PracticeTimingConfidence`, `PracticeTimingSummary`, `PracticeSubmissionPart`, `ConvexActivityId`, `PracticeSubmissionEnvelope`, `PracticeSubmissionCallbackPayload`, `PracticeSubmissionInput`, `PracticeTimingSummaryAlt`, `PracticeSubmissionPartAlt`, `PracticeSubmissionEnvelopeAlt`, `TimingEventType`, `TimingEvent`, `TimingAccumulatorSnapshot`, `TimingAccumulatorOptions`, `TimingSpeedBand`, `PracticeTimingBaseline`, `PracticeTimingFeatures`, `ComputeBaselineInput`, `SrsRating`, `SrsRatingInput`, `SrsRatingResult`, `SeverityByTag`, `ComputeBaseRatingOptions`, `Difficulty`, `PracticeVariant`, `PracticeVariantInput`, `ProblemFamilyInput`, `PracticeItem`, `PracticeItemInput`, `MisconceptionSummary`, `PracticeSubmissionEvidence`, `SubmissionEvidence`, `PartOutcomeSummary`, `StudentErrorProfile`, `LessonErrorSummary`, `DeterministicErrorSummary`, `AISummaryInput`, `AISummaryOutput`, `TeacherErrorView` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/error-analysis/index.ts:13` | `MisconceptionSummary`, `PracticeSubmissionEvidence`, `SubmissionEvidence`, `PartOutcomeSummary`, `StudentErrorProfile`, `LessonErrorSummary`, `DeterministicErrorSummary`, `AISummaryInput`, `AISummaryOutput`, `TeacherErrorView` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/practice-item.ts:23` | `PracticeItemInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/problem-family.ts:9` | `Difficulty`, `PracticeVariant`, `PracticeVariantInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/srs-rating.ts:61` | `SrsRatingResult`, `ComputeBaseRatingOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/submission.schema.ts:4` | `PracticeTimingConfidence`, `PracticeTimingSummary`, `PracticeSubmissionPart`, `PracticeSubmissionEnvelope` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/timing-baseline.ts:64` | `PracticeTimingBaseline` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/practice-core/src/practice/timing.ts:3` | `PracticeTimingSummary`, `PracticeTimingConfidence`, `TimingAccumulatorSnapshot`, `TimingAccumulatorOptions` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/practice-core/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/read-along

Safe 0, needs check 21, false positive 0, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/read-along/components/read-along/read-along-passage.tsx:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/components/read-along/read-along-player.tsx:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/hooks/use-read-along.ts:1` |  | needs check | Open track changes this package. |
| file | `packages/read-along/lib/align.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/cn.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/highlight.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/index.ts:1` |  | needs check | Open track changes this package. |
| file | `packages/read-along/lib/paragraph.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/position.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/profile.ts:1` |  | needs check | Only tests import this file. |
| file | `packages/read-along/lib/seek.ts:1` |  | needs check | Open track changes this package. |
| export | `packages/read-along/components/read-along/read-along-player.tsx:42` | `DEFAULT_READ_ALONG_LABELS`, `DEFAULT_READ_ALONG_CHROME` | needs check | Open track changes this package. |
| export | `packages/read-along/lib/align.ts:8` | `WordTimingSchema` | needs check | Open track changes this package. |
| export | `packages/read-along/lib/position.ts:21` | `LEAD_IN_SECONDS` | needs check | Open track changes this package. |
| type | `packages/read-along/components/read-along/read-along-passage.tsx:15` | `ReadAlongPassageProps` | needs check | Open track changes this package. |
| type | `packages/read-along/components/read-along/read-along-player.tsx:26` | `ReadAlongPlayerLabels`, `ReadAlongPlayerProps` | needs check | Open track changes this package. |
| type | `packages/read-along/lib/profile.ts:7` | `ProfileSentence`, `ProfileTag`, `Profile` | needs check | Open track changes this package. |

### packages/reading-advantage-scripts

Safe 3, needs check 7, false positive 0, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/reading-advantage-scripts/generateArticle.js:308` | `generateArticlesFromCSV`, `randomGenerateArticle` | safe | No module imports this export. |
| export | `packages/reading-advantage-scripts/utils/printLine.js:7` | `printFullWidthLine` | safe | No module imports this export. |
| file | `packages/reading-advantage-scripts/generateArticle.js:1` |  | needs check | Only tests import this file. |
| file | `packages/reading-advantage-scripts/generateQuestion.js:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/reading-advantage-scripts/googleai.js:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/reading-advantage-scripts/readabilityCalculator.js:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/reading-advantage-scripts/utils/googleStorage.js:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `packages/reading-advantage-scripts/utils/printLine.js:1` |  | needs check | Only tests import this file. |
| file | `packages/reading-advantage-scripts/utils/uploadToBucket.js:1` |  | needs check | Manual script run by path; no package script names it. |

### packages/sales-knowledge

Safe 0, needs check 75, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/sales-knowledge/src/contracts.ts:56` | `SalesReleaseProvenanceSchema`, `SalesActivitySourceSchema`, `SalesEvaluatorEligibilitySchema`, `SalesCurriculumBindingSchema`, `SalesRubricSchema`, `parseSalesKnowledgeRelease`, `parseSalesCurriculumBindings` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/data.ts:26` | `salesKnowledgeRelease` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/evidence.ts:32` | `SalesReleaseEvidenceManifestSchema`, `verifySalesReleaseEvidence`, `salesReleaseEvidenceManifest` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/generator.ts:156` | `generateSalesCurriculumBindings`, `digestSalesCurriculumBindings` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/graph.ts:22` | `SALES_MODULE_SLUGS`, `generateSalesKnowledgeRelease` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/index.ts:2` | `APPROVED_CURRICULUM_DIGEST`, `APPROVED_SEED_ARTIFACT`, `APPROVED_SOURCE_COMMIT`, `APPROVAL_EVIDENCE_DIGEST`, `APPROVAL_CANONICAL_SHA256`, `RELEASE_CANDIDATE_BYTE_SHA256`, `RELEASE_CANDIDATE_CANONICAL_SHA256`, `SALES_BINDINGS_CANONICAL_SHA256`, `SALES_GRAPH_CANONICAL_SHA256`, `SALES_KNOWLEDGE_RELEASE_ENVELOPE`, `SALES_KNOWLEDGE_RELEASE_ID`, `STATIC_SEED_BYTE_SHA256`, `SalesActivitySourceSchema`, `SalesCurriculumBindingSchema`, `SalesCurriculumBindingsReleaseSchema`, `SalesEvaluatorEligibilitySchema`, `SalesKnowledgeReleaseSchema`, `SalesReleaseProvenanceSchema`, `SalesRubricSchema`, `parseSalesCurriculumBindings`, `parseSalesKnowledgeRelease`, `SalesReleaseEvidenceManifestSchema`, `loadPackagedSalesEvidenceBytes`, `salesReleaseEvidenceManifest`, `verifySalesReleaseEvidence`, `verifySalesRuntimeArtifacts`, `assertProtectedSalesInventory`, `SALES_PROTECTED_INVENTORY`, `salesCurriculumModulesInReleaseOrder`, `salesProtectedCoordinates`, `generateSalesCurriculumBindings`, `digestSalesCurriculumBindings`, `generateSalesKnowledgeRelease`, `SALES_MODULE_SLUGS`, `salesLessonId`, `salesObjectiveId`, `salesQuizId`, `salesRoleplayId`, `salesRubricId`, `parseAndValidateSalesKnowledgeRelease`, `validateSalesKnowledgeRelease`, `parseSalesCurriculumBindingRelease`, `validateSalesCurriculumBindings`, `salesKnowledgeRelease` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/sales-knowledge/src/inventory.ts:180` | `assertProtectedSalesInventory` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/sales-knowledge/src/contracts.ts:288` | `SalesKnowledgeSpace` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/sales-knowledge/src/evidence.ts:90` | `SalesReleaseEvidenceManifest`, `SalesRuntimeVerificationRequest` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/sales-knowledge/src/index.ts:25` | `SalesCurriculumBindingsRelease`, `SalesCurriculumLessonInput`, `SalesCurriculumModuleInput`, `SalesKnowledgeIssue`, `SalesKnowledgeRelease`, `SalesKnowledgeSpace`, `SalesKnowledgeValidationResult`, `SalesRubricCriterionInput`, `SalesScenarioInput`, `SalesReleaseEvidenceManifest`, `SalesRuntimeVerificationRequest`, `SalesProtectedCoordinate` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/sales-knowledge/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/srs-engine

Safe 2, needs check 185, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| type | `packages/srs-engine/src/srs/objective-proficiency.ts:23` | `ObjectivePriority`, `ObjectivePracticePolicy` | safe | No module imports this type. |
| export | `packages/srs-engine/src/index.ts:3` | `PRIORITY_DEFAULTS`, `STUDENT_DAILY_PRACTICE_COPY`, `TEACHER_DAILY_PRACTICE_COPY`, `DEFAULT_SCHEDULER_CONFIG`, `DEFAULT_REQUEST_RETENTION_BY_PRIORITY`, `resolveRequestRetention`, `mapSrsRatingToGrade`, `mapGradeToSrsRating`, `createCard`, `reviewCard`, `getDueCards`, `previewInterval`, `processReview`, `isOverdue`, `daysOverdue`, `predictCardRetention`, `buildDailyQueue`, `InMemoryCardStore`, `InMemoryReviewLogStore`, `createMockSrsCard`, `createMockSrsReviewLog`, `validateSrsTransition`, `SubmissionSrsAdapter`, `InMemoryPracticeVariantResolver`, `InMemoryTimingBaselineResolver`, `InMemorySubmissionSrsAdapter`, `OBJECTIVE_PRIORITY_VALUES`, `objectivePrioritySchema`, `objectivePolicySchema`, `PROFICIENCY_THRESHOLD_DEFAULTS`, `computeObjectiveProficiency`, `buildStudentProficiencyView`, `buildTeacherProficiencyView`, `STABILITY_SCALE_FACTOR`, `stabilityToRetention`, `aggregateObjectiveRetention`, `computeCorrectedRetentionStrength`, `capEvidenceConfidence`, `aggregateCardsToEvidence`, `CALIBRATION_STATUS_VALUES`, `extractObservations`, `buildContingencyTable`, `computeNecessity`, `computeInformativeness`, `posteriorMean`, `posteriorVariance`, `updatePosterior`, `classifyAbilityStratifiedCalibration`, `applyDecay`, `bucketVariance`, `classifyStatus`, `buildReviewQueueItem`, `buildReviewQueue`, `MAX_FSRS_REPLAY_REVIEWS`, `MAX_SUPPORTED_FSRS_PARAMS_MAJOR`, `fsrsCalibrationReviewSchema`, `validateFsrsParamsVersion`, `validateFsrsReviewMetadata`, `fitFsrsParameters`, `evaluateFsrsReplay`, `interleaveReviewItems`, `fuzzIntervalDays`, `balanceDueDate` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/contract.ts:63` | `PRIORITY_DEFAULTS`, `STUDENT_DAILY_PRACTICE_COPY`, `TEACHER_DAILY_PRACTICE_COPY` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/fsrs-calibration.ts:5` | `MAX_FSRS_REPLAY_REVIEWS`, `MAX_SUPPORTED_FSRS_PARAMS_MAJOR`, `validateFsrsParamsVersion` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/objective-policy.ts:28` | `OBJECTIVE_PRIORITY_VALUES` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/queue.ts:63` | `predictCardRetention`, `isOverdue`, `daysOverdue` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/scheduler.ts:31` | `DEFAULT_REQUEST_RETENTION_BY_PRIORITY`, `previewInterval` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/srs-engine/src/srs/submission-srs-adapter.ts:105` | `SubmissionSrsAdapter`, `InMemoryPracticeVariantResolver` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/index.ts:9` | `ObjectivePriority`, `ObjectivePracticePolicy`, `SrsCardId`, `SrsCardState`, `SrsReviewLogEntry`, `SrsSessionConfig`, `SrsSession`, `PracticeSubmissionEnvelope`, `PracticeSubmissionPart`, `PracticeTimingSummary`, `PracticeTimingBaseline`, `PracticeTimingFeatures`, `TimingSpeedBand`, `SrsRatingInput`, `SrsRatingResult`, `SrsRating`, `SchedulerConfig`, `ReviewProcessorInput`, `ReviewProcessorResult`, `QueueItem`, `BuildDailyQueueOptions`, `CardStore`, `ReviewLogStore`, `SubmissionSrsInput`, `SubmissionSrsResult`, `SubmissionSrsResultSuccess`, `SubmissionSrsResultSkipped`, `SubmissionSrsResultError`, `PracticeVariantInfo`, `PracticeVariantResolver`, `TimingBaselineResolver`, `ObjectivePolicy`, `ObjectivePolicyInput`, `EvidenceConfidence`, `PracticeVariantEvidence`, `ObjectiveProficiencyInput`, `ObjectiveProficiencyResult`, `StudentProficiencyView`, `TeacherProficiencyView`, `ProficiencyCardInput`, `TimingBaselines`, `ObjectiveRetentionCard`, `ProficiencyAttempt`, `CalibrationStatus`, `CalibrationVerdict`, `CalibrationObservation`, `CalibrationContingencyTable`, `EdgeCalibration`, `CalibrationNecessityResult`, `CalibrationReviewQueueItem`, `ReviewQueueBuildInput`, `ReviewQueueBuildOptions`, `CalibrationAbilityBand`, `CalibrationAbilityStratum`, `AbilityStratifiedCalibrationInput`, `CalibrationBandPosterior`, `AbilityStratifiedCalibrationResult`, `FsrsCalibrationReview`, `FsrsPopulationKey`, `FitFsrsParametersInput`, `FsrsFittedParameters`, `FsrsCalibrationArtifact`, `FsrsIncumbentMetrics`, `SyntheticInvariantInput`, `EvaluateFsrsReplayInput`, `FsrsReplayEvaluation`, `InterleavableReviewItem`, `IntervalFuzzInput`, `DueDateBalanceInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/contract.ts:84` | `SrsRatingInput`, `SrsRatingResult`, `TimingSpeedBand`, `PracticeTimingFeatures`, `PracticeTimingSummary`, `SrsSession` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/edge-calibration.ts:29` | `CalibrationAbilityBand`, `CalibrationAbilityStratum`, `AbilityStratifiedCalibrationInput`, `CalibrationBandPosterior`, `AbilityStratifiedCalibrationResult`, `VerdictMap` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/evaluation-harness.ts:9` | `FsrsIncumbentMetrics`, `SyntheticInvariantInput`, `EvaluateFsrsReplayInput`, `FsrsReplayEvaluation` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/fsrs-calibration.ts:25` | `FsrsPopulationKey`, `FitFsrsParametersInput`, `FsrsFittedParameters`, `FsrsCalibrationArtifact` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/objective-policy.ts:14` | `ObjectivePolicy` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/objective-proficiency.ts:47` | `ObjectiveProficiencyInput`, `ObjectiveProficiencyResult`, `StudentProficiencyView`, `TeacherProficiencyView` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/queue.ts:41` | `BuildDailyQueueOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/review-processor.ts:31` | `ReviewProcessorInput`, `ReviewProcessorResult` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/session-composition.ts:2` | `InterleavableReviewItem`, `IntervalFuzzInput`, `DueDateBalanceInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/srs-engine/src/srs/submission-srs-adapter.ts:26` | `SubmissionSrsInput`, `SubmissionSrsResult`, `SubmissionSrsResultSuccess`, `SubmissionSrsResultSkipped`, `SubmissionSrsResultError`, `PracticeVariantInfo`, `PracticeVariantResolver`, `TimingBaselineResolver` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/srs-engine/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/storage

Safe 0, needs check 13, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/storage/src/factory.ts:41` | `createStorageClient` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/storage/src/index.ts:2` | `storageConfigSchema`, `S3StorageDriver`, `createStorageClient`, `getStorageClient`, `resetStorageClient`, `ProviderNotConfiguredError`, `StorageOperationError`, `getStorageUrl`, `createAuthorizedPrivateEvidenceReader` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/storage/src/index.ts:1` | `StorageClient`, `StorageConfig`, `PutOptions` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/storage/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/types

Safe 0, needs check 243, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/types/src/assignment-status.ts:23` | `AssignmentStatus`, `assignmentStatusSchema`, `ALLOWED_ASSIGNMENT_TRANSITIONS`, `QuestionScoringRubric`, `IllegalAssignmentTransitionError`, `assertLegalAssignmentTransition` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/types/src/codecamp.ts:5` | `moduleResponseSchema`, `exerciseSchema`, `quizQuestionSchema`, `quizQuestionPublicSchema`, `lessonResponseSchema`, `lessonListItemSchema`, `moduleBySlugResponseSchema`, `exerciseSubmissionSchema`, `exerciseResultSchema`, `quizAnswerSchema`, `quizSubmissionSchema`, `quizResultSchema`, `chatMessageSchema`, `chatConversationSchema`, `chatMessageInputSchema`, `progressUpdateSchema`, `progressResponseSchema`, `phaseInfoSchema`, `dashboardResponseSchema`, `exerciseRepoSchema`, `exerciseRepoInputSchema`, `prReviewSchema`, `prReviewOperationalStatusSchema`, `prReviewReportSchema`, `prReviewInputSchema`, `prReviewUpdateSchema`, `webhookEventSchema`, `reviewJobStatusEnum`, `reviewJobSchema`, `listDeadReviewJobsInputSchema`, `requeueReviewJobInputSchema`, `githubWebhookPayloadSchema`, `modulePhaseSchema`, `moduleWithReposSchema`, `internAccountInputSchema`, `internProgressSchema`, `internAccountResponseSchema`, `internDetailSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/types/src/contracts/class.ts:5` | `STANDARDS_ALIGNMENT_VALUES`, `JOIN_CODE_CHARSET`, `JOIN_CODE_LENGTH`, `JOIN_CODE_PATTERN`, `isValidJoinCodeFormat`, `createClassSchema`, `updateClassSchema`, `createClassFormSchema`, `joinClassSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/types/src/contracts/envelopes.ts:19` | `ERROR_CODES`, `validationIssueSchema`, `errorBodySchema`, `successEnvelopeSchema`, `listEnvelopeSchema`, `validationErrorEnvelopeSchema`, `unauthorizedEnvelopeSchema`, `forbiddenEnvelopeSchema`, `notFoundEnvelopeSchema`, `conflictEnvelopeSchema`, `internalErrorEnvelopeSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/types/src/contracts/sales.ts:23` | `moduleOutputSchema`, `lessonOutputSchema`, `rubricCriteriaSchema`, `rubricOutputSchema`, `roleplayScenarioOutputSchema`, `roleplayAttemptOutputSchema`, `roleplayAttemptInputSchema`, `ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES`, `ROLEPLAY_MAX_AUDIO_BYTES`, `ROLEPLAY_MAX_AUDIO_DURATION_MS`, `roleplayAudioInputSchema`, `quizSubmissionInputSchema`, `quizResultOutputSchema`, `progressOutputSchema`, `chatMessageOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/types/src/index.ts:29` | `createClassSchema`, `classroomResponseSchema`, `assignmentResponseSchema`, `articleResponseSchema`, `AssignmentStatus`, `assignmentStatusSchema`, `ALLOWED_ASSIGNMENT_TRANSITIONS`, `QuestionScoringRubric`, `IllegalAssignmentTransitionError`, `assertLegalAssignmentTransition`, `activityResponseSchema`, `lessonProgressResponseSchema`, `studentProgressReportSchema`, `classAnalyticsSchema`, `teacherDashboardSchema`, `studentResponseSchema`, `rosterImportResultSchema`, `PolymorphicQuestionId`, `ExternalLessonId`, `STANDARDS_ALIGNMENT_VALUES`, `StandardsAlignment`, `JOIN_CODE_CHARSET`, `JOIN_CODE_LENGTH`, `JOIN_CODE_PATTERN`, `isValidJoinCodeFormat`, `scienceCreateClassSchema`, `scienceUpdateClassSchema`, `scienceCreateClassFormSchema`, `joinClassSchema`, `ERROR_CODES`, `errorBodySchema`, `validationIssueSchema`, `successEnvelopeSchema`, `listEnvelopeSchema`, `validationErrorEnvelopeSchema`, `unauthorizedEnvelopeSchema`, `forbiddenEnvelopeSchema`, `notFoundEnvelopeSchema`, `conflictEnvelopeSchema`, `internalErrorEnvelopeSchema`, `moduleOutputSchema`, `lessonOutputSchema`, `rubricCriteriaSchema`, `rubricOutputSchema`, `roleplayScenarioOutputSchema`, `roleplayAttemptOutputSchema`, `roleplayAttemptInputSchema`, `roleplayAudioInputSchema`, `ROLEPLAY_ALLOWED_AUDIO_MIME_TYPES`, `ROLEPLAY_MAX_AUDIO_BYTES`, `ROLEPLAY_MAX_AUDIO_DURATION_MS`, `quizSubmissionInputSchema`, `quizResultOutputSchema`, `progressOutputSchema`, `chatMessageOutputSchema` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/types/src/codecamp.ts:20` | `ModuleResponse`, `Exercise`, `QuizQuestion`, `QuizQuestionPublic`, `LessonResponse`, `LessonListItem`, `ModuleBySlugResponse`, `ExerciseSubmission`, `ExerciseResult`, `QuizAnswer`, `QuizSubmission`, `QuizResult`, `ChatMessage`, `ChatConversation`, `ChatMessageInput`, `ProgressUpdate`, `ProgressResponse`, `PhaseInfo`, `DashboardResponse`, `ExerciseRepo`, `ExerciseRepoInput`, `PrReviewOperationalStatus`, `PrReviewReport`, `PrReview`, `PrReviewInput`, `PrReviewUpdate`, `WebhookEvent`, `ReviewJob`, `ListDeadReviewJobsInput`, `RequeueReviewJobInput`, `GitHubWebhookPayload`, `ModulePhase`, `ModuleWithRepos`, `InternAccountInput`, `InternAccountResponse`, `InternProgress`, `InternDetail` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/types/src/contracts/class.ts:6` | `StandardsAlignment`, `CreateClassInput`, `UpdateClassInput`, `CreateClassFormInput`, `JoinClassInput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/types/src/contracts/envelopes.ts:28` | `ErrorCode`, `ValidationIssue`, `ErrorBody`, `SuccessEnvelope`, `ListEnvelope`, `ValidationErrorEnvelope`, `UnauthorizedEnvelope`, `ForbiddenEnvelope`, `NotFoundEnvelope`, `ConflictEnvelope`, `InternalErrorEnvelope` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/types/src/contracts/sales.ts:33` | `ModuleOutput`, `LessonOutput`, `RubricCriteria`, `RubricOutput`, `RoleplayScenarioOutput`, `RoleplayAttemptOutput`, `RoleplayAttemptInput`, `RoleplayAudioInput`, `QuizSubmissionInput`, `QuizResultOutput`, `ProgressOutput`, `ChatMessageOutput` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/types/src/index.ts:25` | `UserResponse`, `CreateClassInput`, `ClassroomResponse`, `AssignmentResponse`, `LoginRequest`, `LoginResponse`, `ArticleResponse`, `AssignmentStatusType`, `ActivityResponse`, `LessonProgressResponse`, `StudentProgressReport`, `ClassAnalytics`, `TeacherDashboard`, `StudentResponse`, `RosterImportResult`, `SessionResponse`, `Program`, `ScienceCreateClassInput`, `ScienceUpdateClassInput`, `ScienceCreateClassFormInput`, `JoinClassInput`, `ErrorCode`, `ErrorBody`, `ValidationIssue`, `SuccessEnvelope`, `ListEnvelope`, `ValidationErrorEnvelope`, `UnauthorizedEnvelope`, `ForbiddenEnvelope`, `NotFoundEnvelope`, `ConflictEnvelope`, `InternalErrorEnvelope`, `ModuleOutput`, `LessonOutput`, `RubricCriteria`, `RubricOutput`, `RoleplayScenarioOutput`, `RoleplayAttemptOutput`, `RoleplayAttemptInput`, `RoleplayAudioInput`, `QuizSubmissionInput`, `QuizResultOutput`, `ProgressOutput`, `ChatMessageOutput` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/types/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/ui

Safe 0, needs check 0, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `packages/ui/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/utils

Safe 0, needs check 11, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/utils/src/hooks/index.ts:1` | `useLocalStorage`, `useMediaQuery` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/utils/src/hooks/useMediaQuery.ts:8` | `useMediaQuery` | needs check | Package entry export with no consumer in the workspace. |
| export | `packages/utils/src/index.ts:1` | `cn`, `logStructuredError` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/utils/src/index.ts:4` | `StructuredErrorFields`, `StructuredErrorInput`, `StructuredErrorWriter` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/utils/src/structured-error.ts:2` | `StructuredErrorFields`, `StructuredErrorInput`, `StructuredErrorWriter` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/utils/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### packages/webhooks

Safe 8, needs check 14, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `packages/webhooks/src/github-client.ts:46` | `getAppId`, `getPrivateKey`, `getInstallationId`, `getInstallationToken` | safe | No module imports this export. |
| type | `packages/webhooks/src/github-client.ts:5` | `GitHubComment`, `GitHubPRInfo`, `GitHubCheckRunEvidence`, `GitHubCheckEvidence` | safe | No module imports this type. |
| export | `packages/webhooks/src/github-client.ts:72` | `generateAppJWT`, `isWebhookTimestampFresh`, `postReviewComment` | needs check | Only tests use this symbol. |
| export | `packages/webhooks/src/review-worker.ts:80` | `CLAIM_BATCH_SIZE`, `VISIBILITY_TIMEOUT_MS`, `BASE_BACKOFF_MS`, `MAX_ATTEMPTS`, `MAX_JITTER_MS`, `__resetReviewWorkerState`, `WORKER_ID`, `DEFAULT_TICK_DEADLINE_MS` | needs check | Package entry export with no consumer in the workspace. |
| type | `packages/webhooks/src/review-worker.ts:185` | `EnqueueReviewJobInput`, `EnqueueReviewJobResult`, `ReviewWorker` | needs check | Package entry export with no consumer in the workspace. |
| file | `packages/webhooks/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### services/session-service

Safe 0, needs check 10, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| export | `services/session-service/src/config.ts:6` | `sessionServiceConfigSchema` | needs check | Package entry export with no consumer in the workspace. |
| export | `services/session-service/src/room-store.ts:13` | `storedSubmissionSchema`, `storedRoundSchema`, `InMemoryRoomStore` | needs check | Package entry export with no consumer in the workspace. |
| export | `services/session-service/src/server.ts:123` | `SessionCommandError` | needs check | Package entry export with no consumer in the workspace. |
| type | `services/session-service/src/config.ts:15` | `SessionServiceConfig` | needs check | Package entry export with no consumer in the workspace. |
| type | `services/session-service/src/room-store.ts:49` | `StoredRound`, `StoredSubmission` | needs check | Package entry export with no consumer in the workspace. |
| type | `services/session-service/src/server.ts:120` | `SessionCommandErrorCode`, `CreateSessionServerOptions` | needs check | Package entry export with no consumer in the workspace. |
| file | `services/session-service/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### services/worker

Safe 0, needs check 7, false positive 1, unreachable modules 0.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| file | `services/worker/src/worker-composition.ts:1` |  | needs check | Only tests import this file. |
| type | `services/worker/src/health.ts:5` | `WorkerHealthStatus`, `WorkerHealthStateOptions`, `WorkerHealthServerOptions` | needs check | Package entry export with no consumer in the workspace. |
| type | `services/worker/src/oci-contract.ts:33` | `WorkerDeploymentTarget`, `WorkerOciContract` | needs check | Package entry export with no consumer in the workspace. |
| type | `services/worker/src/startup-config.ts:31` | `WorkerStartupConfig` | needs check | Package entry export with no consumer in the workspace. |
| file | `services/worker/eslint.config.mjs:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |

### (root)

Safe 0, needs check 150, false positive 10, unreachable modules 5.

| Kind | Location | Symbols | Verdict | Reason |
|---|---|---|---|---|
| module | `measure/archive/` | | needs check | Every code file in this directory is unused. |
| module | `measure/qa/` | | needs check | Every code file in this directory is unused. |
| module | `measure/tracks/` | | needs check | Every code file in this directory is unused. |
| module | `scripts/primary-parity/` | | needs check | Every code file in this directory is unused. |
| module | `test-fixtures/architecture-enforcement/` | | needs check | Every code file in this directory is unused. |
| file | `measure/archive/apk_catalog_cutover_w0_20260710/verify-legacy-deletion-manifest.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/asset-ontology.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/asset-usage.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/audit-validator.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/capability-ontology.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/game-corpus.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/mechanic-blueprints.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/__tests__/responsive-composition.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/audit-schema.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-asset-usage.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-blueprints.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-capabilities.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-corpus.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-ontology.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_cross_game_asset_ontology_20260712/generate-responsive.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_existing_asset_candidate_audit_20260712/generate_phase3_audio_working_notes.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_legacy_catalog_manual_browser_evidence_20260819/capture-screenshots.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_legacy_defense_cutover_20260727/__tests__/task2-suitability-manifest.test.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_source_denominator_inventory_20260712/transition_ast_helper.bundle.cjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/apk_source_denominator_inventory_20260712/transition_ast_helper.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/__tests__/baseline-truth.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/__tests__/batch-gates.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/__tests__/phase3-contracts.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/__tests__/phase4-contracts.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/__tests__/validate-matrix.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/manifest-probe.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/dependency_upgrade_hardening_20260607/scripts/validate-matrix.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/pnpm11_major_migration/__tests__/pnpm-lock-baseline.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/pnpm11_major_migration/__tests__/pnpm11-lockfile-contract.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/pnpm11_major_migration/__tests__/pnpm11-phase4-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/pnpm11_major_migration/__tests__/pnpm11-workspace-config.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/post_24h_audit_remediation_20260612/__tests__/phase1-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/post_24h_audit_remediation_20260612/__tests__/phase3-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/post_24h_audit_remediation_20260612/__tests__/phase4-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/post_24h_audit_remediation_20260612/__tests__/phase5-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/post_24h_audit_remediation_20260612/__tests__/phase6-closeout.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase0-preflight.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase1-schema-port.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase2-prisma-replacement.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase3-models.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase4-actions.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase5-routes.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase6-components.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase7-utils.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase8-cleanup.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_advantage_drizzle_migration_20260526/__tests__/phase9-verification.test.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_admin_dashboard_20261011/acceptance-steps-other-school.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_admin_dashboard_20261011/acceptance-steps-school.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_class_books_20261011/acceptance-steps-class-book.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_lesson_repeat_20261011/acceptance-steps-lesson-repeat.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_print_lesson_20261011/acceptance-steps-print-lesson.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_pwa_20261011/acceptance-steps-pwa.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_qr_path_20261011/acceptance-steps-qr-path.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_staff_student_view_20261011/acceptance-steps-student-view-book.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_staff_student_view_20261011/acceptance-steps-student-view-lesson.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_stories_20261011/acceptance-steps-stories.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_stories_20261011/acceptance-steps-story-mcq.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_stories_20261011/acceptance-steps-story-written.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_system_dashboard_20261011/acceptance-steps-open-school.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_teacher_home_20261011/acceptance-steps-class-link.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/primary_parity_teacher_home_20261011/acceptance-steps-search-sort.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/archive/shared_video_tutorial_runtime_20260710/evidence/s2-browser/activity-runtime-demo.spec.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-2026-10-05/gates/sweep.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t1-auth-csv/qa-csv-rerun.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t1-auth-csv/qa-script.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t1-auth-csv/qa-verify-logout.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t3-games/drive-games-v2.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t3-games/drive-games-v3.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t3-games/drive-games-v4.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t3-games/drive-games.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t4-teacher-admin-v2/driver-t4-v2.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t4-teacher-admin/driver-t4.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t6-a11y/a11y-driver.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t6-a11y/a11y-final.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/qa/browser-20260915/t6-a11y/a11y-followup.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/negative/apps/marketing/public-auth-port.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/negative/packages/backend/src/modules/company-identity/adapters/postgres/index.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/negative/packages/db/src/company-identity/migration.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/negative/support/public-company-auth-port.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/codecamp/consume-reexport.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/codecamp/reexport-identity-schema.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/marketing/direct-identity-client.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/marketing/route-imports-postgres-adapter.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/marketing/static-dynamic-import.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/sales/identity-barrel.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/sales/postgres-company-env.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/apps/sales/sales-through-local-alias.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/packages/db/src/schema/index.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/packages/domain/src/tenant-registry.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_parity_quick_fixes_20261011/acceptance-steps-fr13-new.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_parity_quick_fixes_20261011/acceptance-steps-fr13-old.ts:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase0/backdrops/shoot.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase0/mocks/shoot-mocks.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase5/scripts/boss-fall.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase5/scripts/capture.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase5/scripts/quest-move.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase5/scripts/quest-stage.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_rpg_skin_20261006/phase5/scripts/shot3.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `measure/tracks/primary_student_login_20261003/evidence/login25.mjs:1` |  | needs check | Track evidence script run by hand; delete only with the track owner. |
| file | `scripts/backfill-school-id.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/batch.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/class-book-checks.test.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/guards.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/legacy-credential.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/pairs.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/qr-path-checks.test.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/report.test.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/staff-preview-checks.test.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/__tests__/stories-checks.test.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/accounts-file.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/accounts.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/capture.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/class-book-checks.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/cutover-check.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/guards.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/legacy-credential.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/pairs.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/qr-path-checks.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/report.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/sign-in.ts:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/staff-preview-checks.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `scripts/primary-parity/stories-checks.mjs:1` |  | needs check | Manual script run by path; no package script names it. |
| file | `test-fixtures/architecture-enforcement/database/alias/apps/sales/src/alias-import.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/alias/packages/db-alias/src/index.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/approved-adapter/packages/backend/src/jobs/adapters/postgres/claim.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/barrel/apps/marketing/src/db-barrel.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/barrel/apps/marketing/src/report.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/direct/apps/marketing/src/direct.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/dynamic/apps/sales/src/load-database.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/raw-client/apps/marketing/app/api/report/route.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/webhook-job-table/packages/webhooks/src/claim-review-job.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/worker-job-port/packages/backend/src/jobs/index.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/worker-job-port/services/worker/src/poll.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/database/worker-job-table/services/worker/src/poll.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-adapter/packages/ai/src/providers/openai.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-alias/apps/marketing/src/generate-copy.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-alias/packages/ai-alias/src/index.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-client/apps/sales/src/provider-client.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-credential/apps/marketing/src/provider-environment.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-direct/apps/marketing/src/provider-sdk.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-internal-interface/apps/marketing/src/generate-copy.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/ai-internal-interface/packages/ai/src/index.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/exact-test-exception/packages/storage/src/__tests__/s3-driver.test.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/integration-adapter/packages/integrations/github/src/drivers/client.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/integration-dynamic/apps/sales/src/load-stripe.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/storage-adapter/packages/storage/src/drivers/gcs.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/storage-barrel/apps/marketing/src/assets.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/storage-barrel/apps/marketing/src/storage-barrel.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/storage-internal-interface/apps/marketing/src/assets.ts:1` |  | needs check | Open track changes this package. |
| file | `test-fixtures/architecture-enforcement/provider/storage-internal-interface/packages/storage/src/index.ts:1` |  | needs check | Open track changes this package. |
| file | `measure/archive/shared_video_tutorial_runtime_20260710/evidence/s2-browser/playwright.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `measure/tracks/company_identity_sso_20260715/fixtures/architecture/positive/packages/db/drizzle.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
| file | `packages/__tests__/mastery-engine-import-contract.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-adversarial.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-guard-list.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-p2-adversarial.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-redeploy-list.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-verification-ledger.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `tests/security-upgrade-version-guard.test.ts:1` |  | false positive | Run by root-level vitest; root has no vitest plugin in knip. |
| file | `vitest.config.ts:1` |  | false positive | Tool config file loaded by its CLI, not by an import. |
## Top 10 findings by risk

Risk means harm if the code stays: a security path, a second copy of a rule, or a feature that looks wired but is not.

1. `apps/reading-advantage/lib/password-utils.ts:3` — An unused bcrypt password helper sits beside the Argon2id policy, and a later import would weaken password hashing. Fix: delete the file.
2. `apps/reading-advantage/lib/use-trpc-auth.ts:13` — An unused client auth hook gives a second auth path outside the auth adapter. Fix: delete the file.
3. `packages/webhooks/src/review-worker.ts:181` — The `./review-worker` entry exports the test reset hook `__resetReviewWorkerState`, and no test or caller uses it. Fix: drop the `export` keyword from that function.
4. `packages/domain/src/workbooks/ai-proposal.ts:118` — `approveWorkbookProposal` holds approval logic with no caller and no test, so it can drift from the live workbook flow. Fix: delete the file.
5. `apps/workbooks/lib/html-to-pdf.ts:12` — The PDF converter binding has no caller, so the workbook PDF path may lack its converter. Fix: pass `htmlToPdf` to the domain PDF renderer where the app renders workbooks, or delete the file.
6. `apps/reading-advantage/server/utils/verify-user-expired.ts:1` — An unused second license-expiry rule can drift from the live check. Fix: delete the file.
7. `apps/reading-advantage/server/services/metrics/cache-service.ts:272` — A 312-line in-process metrics cache with a `setInterval` cleanup has no importer. Fix: delete the file.
8. `apps/science-advantage/lib/auth/index.ts:1` — An unused auth barrel re-exports session and role helpers that callers import directly. Fix: delete the barrel.
9. `packages/db/src/accounting/index.ts:1` — An `export *` barrel is not in the package `exports` map and nothing imports it. Fix: delete the file.
10. `packages/domain/src/articles/schema.ts:1` — This file and nine sibling `schema.ts` files (assignments, curriculum, gamification, licenses, progress, quiz, reports, stories, users) re-export db tables that no module imports. Fix: delete the ten one-line files.

## Method and limits

- Tool: `pnpm dlx knip@5` (5.88.1) with `--include files,exports,types`, after `pnpm install --frozen-lockfile --ignore-scripts`. The knip config lived outside the repository and is not committed.
- The config turns off jest config loading in apps/advantage-games and apps/reading-advantage, because `next/jest` throws there under knip. Test globs replace it as entries.
- A second pass with `--production` marks symbols and files that only tests use. A third pass with `--include-entry-exports` marks package entry exports with no consumer.
- A text search marks files that another file in the same workspace names by path, as with a dynamic import or a test that reads source.
- knip has no vinext plugin and no root vitest plugin, so routes in apps/marketing and apps/activity-vinext-fixture and the root `tests/` files show up as false positives.
- "Safe" means no static import, script, config, or path reference reaches the symbol. Run `pnpm turbo run check-types test` after each delete.
