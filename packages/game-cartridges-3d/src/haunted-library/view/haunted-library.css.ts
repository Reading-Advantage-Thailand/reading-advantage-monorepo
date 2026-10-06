// Generated from haunted-library.css (the stylesheet text; installed once by installCss).
export default `/* Haunted Library HUD: the action buttons at the bottom right, the courage meter, and word tags that glow near. */
.lib-actions {
  position: absolute;
  right: 14px;
  bottom: max(18px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
}
.lib-actions button {
  pointer-events: auto;
  min-width: 84px;
  min-height: 56px;
  padding: 10px 18px;
  border: 3px solid #fff;
  border-radius: 28px;
  background: #4b3a73;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 5px 0 rgba(0, 0, 0, 0.35);
  cursor: pointer;
  touch-action: manipulation;
}
.lib-actions button.open {
  min-width: 112px;
  min-height: 72px;
  background: #6b6f80;
  font-size: 24px;
  opacity: 0.8;
}
.lib-actions button.open.ready {
  background: #e8a21a;
  color: #2b1d3a;
  opacity: 1;
  animation: lib-pulse 0.9s ease-in-out infinite;
}
.lib-actions button:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.35);
}
@keyframes lib-pulse {
  50% {
    transform: scale(1.07);
  }
}
.apk3d-hud .meter b {
  margin-left: 4px;
  text-decoration: none;
  letter-spacing: 1px;
}
`;
