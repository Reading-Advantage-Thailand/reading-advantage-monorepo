// Generated from rune-forge-chamber.css (the stylesheet text; installed once by installCss).
export default `/* Rune Forge Chamber 3D: the rune word tags are buttons (the base .arena-tag ignores the pointer). */
.apk3d-hud .arena-tag.rune-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 15px;
  background: #1d3350;
  border-color: #a9d8ff;
  font-size: 20px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.rune-tag.aimed {
  border-color: var(--gold);
  transform: translate(-50%, -100%) scale(1.12);
}
.apk3d-hud .arena-tag.rune-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.rune-tag.dim {
  opacity: 0.45;
  pointer-events: none;
  background: #4a4a58;
}
.apk3d-hud .rune-hint {
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
