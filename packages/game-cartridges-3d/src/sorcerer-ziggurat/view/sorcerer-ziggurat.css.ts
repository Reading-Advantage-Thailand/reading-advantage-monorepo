// Generated from sorcerer-ziggurat.css (the stylesheet text; installed once by installCss).
export default `/* Sorcerer's Ziggurat 3D: the rune cube word tags are buttons (the base .arena-tag ignores the pointer). */
.apk3d-hud .arena-tag.zig-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 16px;
  background: #2a1b5c;
  border-color: #c9b8ff;
  font-size: 21px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.zig-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.zig-tag.spent {
  opacity: 0.45;
  pointer-events: none;
  background: #4a4a58;
}
.apk3d-hud .zig-prompt {
  position: absolute;
  left: 50%;
  top: 150px;
  transform: translateX(-50%);
  max-width: min(92vw, 560px);
  padding: 6px 14px;
  border-radius: 14px;
  background: rgba(18, 26, 44, 0.7);
  color: #fff;
  font-weight: 700;
  text-align: center;
  pointer-events: none;
}
.apk3d-hud .zig-prompt:empty {
  display: none;
}
.apk3d-hud .zig-hint {
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
