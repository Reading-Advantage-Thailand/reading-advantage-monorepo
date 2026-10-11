// Generated from dragon-rider.css (the stylesheet text; installed once by installCss).
export default `/* Dragon Rider HUD: the word banner, the gate tags, the dark dragon's power, and the answer audio controls. */
.rider-word {
  position: absolute;
  left: 50%;
  top: calc(78px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%) translateY(-10px);
  width: max-content;
  min-width: 180px;
  max-width: calc(100vw - 32px);
  padding: 8px 20px 10px;
  border-radius: 20px;
  background: var(--paper);
  text-align: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.rider-word.on {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.rider-word small {
  display: block;
  color: #7a6a8a;
  font-size: 13px;
  font-weight: 600;
}
.rider-word b {
  font-size: 32px;
  line-height: 1.1;
}
.rider-power {
  position: absolute;
  left: 50%;
  top: calc(78px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  padding: 6px 16px;
  border-radius: 16px;
  background: #2b1d3a;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}
.rider-power.on {
  opacity: 1;
}
.gate-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  max-width: 130px;
  min-height: 52px;
  padding: 6px 12px;
  border: 3px solid #fff;
  border-radius: 14px;
  background: #2b1d3a;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
}
.gate-tag.th {
  font-size: 22px;
}
.gate-tag.pulse {
  animation: gate-pulse 0.8s ease-in-out infinite;
}
@keyframes gate-pulse {
  50% {
    transform: translate(-50%, -100%) scale(1.1);
  }
}
.gate-tag.right {
  border-color: var(--green);
  background: #1f7a3a;
}
.gate-tag.wrong {
  border-color: var(--red);
  background: #7a1f1f;
}
.gate-tag.dim {
  opacity: 0.4;
}
.gate-tag.held {
  border-color: #fde68a;
}
/* Answer audio: one "n 🔊" control per gate, inside the word box under the meaning. */
.rider-listen {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  /* The word box lets touches through; its buttons take them. */
  pointer-events: auto;
}
.rider-listen button {
  min-width: 64px;
  height: 48px;
  border: 3px solid #a5b4fc;
  border-radius: 12px;
  background: #312e81;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}
.rider-listen button[data-look='playing'] {
  border-color: #fde68a;
}
.rider-listen button[data-look='heard'] {
  border-color: #86efac;
}
.rider-listen button[data-look='failed'] {
  border-color: #fca5a5;
}
.rider-listen button[data-look='used'] {
  opacity: 0.55;
}
`;
