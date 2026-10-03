// Generated from devourer-power.css (the stylesheet text; installed once by installCss).
export default `/* The power-up of Devourer Slime: the countdown badge, its draining bar, and the pulsing frame. */
.apk3d-hud .power-badge {
  position: absolute;
  top: 130px;
  left: 50%;
  transform: translateX(-50%) scale(0.6);
  opacity: 0;
  pointer-events: none;
  min-width: 220px;
  padding: 8px 24px 10px;
  border-radius: 999px;
  border: 4px solid #fff;
  background: var(--gold, #ffd84a);
  color: var(--ink, #2b1d3a);
  font-size: 28px;
  font-weight: 800;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 6px 0 #b8841a, 0 0 28px 6px rgba(255, 216, 74, 0.8);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.apk3d-hud .power-badge.on {
  opacity: 1;
  transform: translateX(-50%) scale(1);
  animation: power-bob 0.6s ease-in-out infinite alternate;
}
.apk3d-hud .power-badge .bar {
  display: block;
  height: 10px;
  margin-top: 6px;
  border-radius: 6px;
  background: rgba(43, 29, 58, 0.28);
  overflow: hidden;
}
.apk3d-hud .power-badge .bar i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: var(--ink, #2b1d3a);
}
.apk3d-hud .power-badge.low {
  background: #ff5a4a;
  color: #fff;
  box-shadow: 0 6px 0 #9c2a1e, 0 0 28px 6px rgba(255, 90, 74, 0.85);
  animation: power-blink 0.25s steps(2, jump-none) infinite;
}
.apk3d-hud .power-badge.low .bar i {
  background: #fff;
}
.apk3d-hud .power-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  box-shadow: inset 0 0 0 8px #ffd84a, inset 0 0 90px 24px rgba(255, 216, 74, 0.55);
  transition: opacity 0.25s ease;
}
.apk3d-hud .power-frame.on {
  opacity: 1;
  animation: power-pulse 0.7s ease-in-out infinite alternate;
}
.apk3d-hud .power-frame.low {
  box-shadow: inset 0 0 0 8px #ff5a4a, inset 0 0 90px 24px rgba(255, 90, 74, 0.6);
  animation-duration: 0.25s;
}
@keyframes power-bob {
  from { transform: translateX(-50%) scale(1); }
  to { transform: translateX(-50%) scale(1.07); }
}
@keyframes power-blink {
  from { opacity: 1; }
  to { opacity: 0.55; }
}
@keyframes power-pulse {
  from { opacity: 0.55; }
  to { opacity: 1; }
}
`;
