// The scoped stylesheet of the story game host (briefing, results, gate panels).
// The panels use the Chibi Quest kit parchment (track primary_rpg_skin_20261006, skin spec row 12).
// The --cq-* tokens come from the host page (apps/primary-advantage/styles/rpg.css); the fallbacks
// are the same colors, so a page without the tokens shows the same panel.
export default `.apk3d-story-host {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  font-family: var(--font);
  color: var(--ink);
}
.apk3d-story-host .apk3d-screen {
  position: absolute;
  inset: 0;
  display: none;
  overflow-y: auto;
  padding: 20px 16px 24px;
  background: linear-gradient(180deg, rgba(12, 17, 24, 0.2), rgba(12, 17, 24, 0.9) 40%);
  z-index: 5;
}
.apk3d-story-host .apk3d-screen.on {
  display: block;
}
.apk3d-story-host .apk3d-play {
  position: absolute;
  inset: 0;
  display: none;
}
.apk3d-story-host .apk3d-play.on {
  display: block;
}
.apk3d-story-host .panel {
  max-width: 560px;
  margin: 0 auto;
  padding: 18px;
  border: 3px solid var(--cq-parchment-edge, #b58a4e);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--cq-parchment, #f3e4c3), var(--cq-parchment-2, #e6cf9f));
  color: var(--cq-ink, #3b2a1a);
  font-family: var(--cq-font, inherit);
  box-shadow:
    0 6px 0 rgba(0, 0, 0, 0.25),
    0 10px 24px rgba(0, 0, 0, 0.35),
    inset 0 0 0 2px rgba(255, 255, 255, 0.35);
}
/* The heading is a wood sign. */
.apk3d-story-host .panel h2 {
  margin: 0 0 8px;
  padding: 8px 14px;
  border: 3px solid var(--cq-wood-dark, #5c391a);
  border-radius: 10px;
  text-align: center;
  font-size: 28px;
  color: #fff4dc;
  background: linear-gradient(180deg, var(--cq-wood-light, #b37a3f), var(--cq-wood, #8a5a2b) 55%, var(--cq-wood-dark, #5c391a));
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
}
/* Gold for the main action, iron for the way back. */
.apk3d-story-host .panel .btn {
  min-height: 48px;
  border: 3px solid transparent;
  border-radius: 12px;
}
.apk3d-story-host .panel .btn.gold {
  color: var(--cq-ink, #3b2a1a);
  border-color: var(--cq-gold-dark, #a8781a);
  background: linear-gradient(180deg, #ffd96b, var(--cq-gold, #e8b534) 55%, var(--cq-gold-dark, #a8781a));
  box-shadow: 0 4px 0 var(--cq-gold-dark, #a8781a);
}
.apk3d-story-host .panel .btn.soft {
  color: #fff4dc;
  border-color: #2d3138;
  background: var(--cq-iron, #4a4f57);
  box-shadow: 0 4px 0 #2d3138;
}
.apk3d-story-host .panel .btn:active {
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-story-host .stars {
  text-align: center;
  font-size: 48px;
  letter-spacing: 6px;
  color: rgba(107, 84, 56, 0.3);
}
.apk3d-story-host .stars .lit {
  color: var(--gold);
  -webkit-text-stroke: 2px #b8841a;
}
.apk3d-story-host .panel .xp {
  text-align: center;
  font-weight: 700;
  font-size: 18px;
}
.apk3d-story-host .panel .xp small {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--cq-ink-soft, #6b5438);
}
.apk3d-story-host .panel h3 {
  margin: 16px 0 6px;
  font-size: 18px;
}
.apk3d-story-host .chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.apk3d-story-host .chip {
  padding: 5px 10px;
  border: 1px solid var(--cq-parchment-edge, #b58a4e);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.5);
  font-weight: 700;
  font-size: 14px;
}
.apk3d-story-host .chip.ok {
  background: #dcebc4;
}
.apk3d-story-host .panel .actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.apk3d-story-host .panel.briefing .eyebrow {
  margin-bottom: 4px;
  text-align: center;
  color: var(--cq-ink-soft, #6b5438);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.apk3d-story-host .panel.briefing h2 .icon {
  font-size: 26px;
}
.apk3d-story-host .panel.briefing .subtitle {
  text-align: center;
  color: var(--cq-ink-soft, #6b5438);
  font-size: 14px;
}
.apk3d-story-host .panel.briefing .goal {
  margin: 12px 0 4px;
  padding: 10px 12px;
  border: 2px solid rgba(181, 138, 78, 0.5);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.4);
  font-size: 16px;
  line-height: 1.35;
}
.apk3d-story-host .steps {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
}
.apk3d-story-host .steps li {
  counter-increment: step;
  position: relative;
  padding: 6px 0 6px 40px;
  font-size: 15px;
  line-height: 1.3;
}
.apk3d-story-host .steps li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 5px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--cq-wood, #8a5a2b);
  color: #fff4dc;
  font-weight: 700;
  text-align: center;
  line-height: 28px;
}
.apk3d-story-host .steps b {
  display: block;
}
.apk3d-story-host .controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.apk3d-story-host .control {
  padding: 5px 10px;
  border: 1px solid var(--cq-parchment-edge, #b58a4e);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}
.apk3d-story-host .panel .tip {
  margin-top: 10px;
  padding: 10px 12px;
  border: 2px dashed rgba(181, 138, 78, 0.6);
  border-radius: 10px;
  background: rgba(255, 244, 208, 0.6);
  font-size: 15px;
}
.apk3d-story-host .panel.gate {
  text-align: center;
}
.apk3d-story-host .gate-icon {
  font-size: 54px;
}
`;
