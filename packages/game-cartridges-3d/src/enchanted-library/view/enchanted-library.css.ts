// Generated from enchanted-library.css (the stylesheet text; installed once by installCss).
export default `/* Enchanted Library 3D: the prompt card, the book tags (buttons), and the shield button. */
.apk3d-hud .lib-prompt {
  position: absolute;
  top: 74px;
  left: 50%;
  transform: translateX(-50%);
  max-width: min(92vw, 520px);
  padding: 8px 18px 10px;
  border-radius: 16px;
  background: rgba(255, 250, 240, 0.97);
  color: #2b1d3a;
  text-align: center;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
.apk3d-hud .lib-prompt small {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: #6a3fd1;
}
.apk3d-hud .lib-prompt b {
  display: block;
  font-size: 28px;
  line-height: 1.3;
}
.apk3d-hud .arena-tag.lib-tag {
  pointer-events: auto;
  cursor: pointer;
  padding: 9px 15px;
  background: #3b2a66;
  border-color: #c9b8ff;
  font-size: 20px;
  touch-action: manipulation;
}
.apk3d-hud .arena-tag.lib-tag.next {
  border-color: var(--gold);
  box-shadow: 0 0 14px rgba(255, 216, 74, 0.8), 0 4px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .arena-tag.lib-tag.spent {
  opacity: 0.4;
  pointer-events: none;
  background: #4a4a58;
}
.apk3d-hud .lib-actions {
  position: absolute;
  right: 14px;
  bottom: max(18px, env(safe-area-inset-bottom));
  pointer-events: none;
}
.apk3d-hud .lib-actions button {
  pointer-events: auto;
  min-width: 112px;
  min-height: 72px;
  padding: 10px 18px;
  border: 3px solid #fff;
  border-radius: 36px;
  background: #3b82f6;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
  cursor: pointer;
  touch-action: manipulation;
}
.apk3d-hud .lib-actions button:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}
.apk3d-hud .lib-actions button:disabled {
  background: #6b6f80;
  opacity: 0.7;
}
`;
