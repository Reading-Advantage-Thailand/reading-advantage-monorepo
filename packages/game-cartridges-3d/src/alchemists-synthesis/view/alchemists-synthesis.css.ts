// Generated from alchemists-synthesis.css (the stylesheet text; installed once by installCss).
export default `/* Alchemist's Synthesis 3D: the recipe card, and the jar word tags (buttons; the base .arena-tag ignores the pointer). */
.apk3d-hud .alch-formula {
  position: absolute;
  left: 50%;
  top: calc(76px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 8px 20px 10px;
  border-radius: 16px;
  background: var(--paper);
  color: var(--ink);
  text-align: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
.apk3d-hud .alch-formula small {
  display: block;
  color: var(--purple);
  font-size: 14px;
  font-weight: 700;
}
.apk3d-hud .alch-formula b {
  display: block;
  font-size: 28px;
  line-height: 1.25;
}
.apk3d-hud .arena-tag.alch-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 16px;
  background: #3a2418;
  border-color: #ffd9a0;
  font-size: 20px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.alch-tag.aimed {
  border-color: var(--gold);
  transform: translate(-50%, -100%) scale(1.1);
}
.apk3d-hud .arena-tag.alch-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.alch-tag.dim {
  opacity: 0.45;
  pointer-events: none;
  background: #4a4a58;
}
.apk3d-hud .alch-hint {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 14px;
  background: rgba(18, 26, 44, 0.7);
  color: #fff;
  font-weight: 700;
  pointer-events: none;
}
`;
