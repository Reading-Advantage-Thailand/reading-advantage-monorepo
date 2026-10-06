// Generated from astral-mage.css (the stylesheet text; installed once by installCss).
export default `/* Astral Mage 3D: the crystal word tags are buttons (the base .arena-tag ignores the pointer). */
.apk3d-hud .arena-tag.astral-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 15px;
  background: #2a1b5c;
  border-color: #c9b8ff;
  font-size: 20px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.astral-tag.aimed {
  border-color: var(--gold);
  transform: translate(-50%, -100%) scale(1.12);
}
.apk3d-hud .arena-tag.astral-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.astral-tag.dim {
  opacity: 0.45;
  pointer-events: none;
  background: #4a4a58;
}
.apk3d-hud .astral-hint {
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
