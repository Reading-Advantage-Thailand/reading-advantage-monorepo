// The scoped stylesheet of the story game host (briefing, results, gate panels).
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
  border-radius: 24px;
  background: var(--paper);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}
.apk3d-story-host .panel h2 {
  margin: 0 0 6px;
  text-align: center;
  font-size: 30px;
  color: var(--purple);
}
.apk3d-story-host .stars {
  text-align: center;
  font-size: 48px;
  letter-spacing: 6px;
  color: #d9d0e8;
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
  color: #7a6a8a;
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
  border-radius: 99px;
  background: #efe8fb;
  font-weight: 700;
  font-size: 14px;
}
.apk3d-story-host .chip.ok {
  background: #e6f8ea;
}
.apk3d-story-host .panel .actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
.apk3d-story-host .panel.briefing .eyebrow {
  text-align: center;
  color: var(--purple);
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
  color: #7a6a8a;
  font-size: 14px;
  margin-top: -4px;
}
.apk3d-story-host .panel.briefing .goal {
  margin: 12px 0 4px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #f3edfd;
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
  background: var(--purple);
  color: #fff;
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
  border-radius: 99px;
  background: #efe8fb;
  font-size: 13px;
}
.apk3d-story-host .panel .tip {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  background: #fff4d0;
  font-size: 15px;
}
.apk3d-story-host .panel.gate {
  text-align: center;
}
.apk3d-story-host .gate-icon {
  font-size: 54px;
}
`;
