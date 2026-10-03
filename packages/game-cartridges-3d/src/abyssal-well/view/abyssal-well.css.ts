// Generated from abyssal-well.css (the stylesheet text; installed once by installCss).
export default `/* Abyssal Well 3D: the creature word tags are buttons (the base .arena-tag ignores the pointer). */
.apk3d-hud .arena-tag.well-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 15px;
  background: #1d2a44;
  border-color: #8fb2e8;
  font-size: 20px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.well-tag.aimed {
  border-color: var(--gold);
  transform: translate(-50%, -100%) scale(1.12);
}
.apk3d-hud .arena-tag.well-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.well-tag.bounced {
  border-color: #e0452f;
  background: #4a2a2a;
}
.apk3d-hud .arena-tag.well-tag.done {
  pointer-events: none;
}
.apk3d-hud .well-hint {
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
.apk3d-hud .well-translation {
  margin-top: 4px;
  text-align: center;
  color: #fff;
  font-size: 15px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}
`;
