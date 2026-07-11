# Host/cartridge annotated diff

- `manifest`: declares catalog and runtime compatibility; it does not persist learner state.
- `matchesWord`: owns deterministic educational logic inside the cartridge.
- React host: mounts the cartridge, validates completion, persists evidence, and navigates.
- Phaser scene: owns per-frame input and presentation, never authentication or database access.
