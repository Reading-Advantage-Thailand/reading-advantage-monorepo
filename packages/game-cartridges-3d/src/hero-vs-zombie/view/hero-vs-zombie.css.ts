// Generated from hero-vs-zombie.css (the stylesheet text; installed once by installCss).
export default `/* Hero vs. Zombie HUD: the target word, the answer audio controls, and the Blast button. */
.hvz-target {
  position: absolute;
  left: 50%;
  top: calc(76px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 6px 18px 8px;
  border-radius: 18px;
  background: var(--paper);
  text-align: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
.hvz-target small {
  display: block;
  color: #7a6a8a;
  font-size: 13px;
  font-weight: 600;
}
.hvz-target b {
  font-size: 30px;
  line-height: 1.1;
}
.blast-button {
  position: absolute;
  right: 18px;
  bottom: calc(22px + env(safe-area-inset-bottom, 0px));
  width: 92px;
  height: 92px;
  border: 4px solid #fff;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #fff6a8, #ffb020 60%, #b8641a);
  color: #3a1f05;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35), 0 0 24px rgba(255, 190, 60, 0.6);
}
.blast-button b {
  display: block;
  margin-top: 4px;
  font-size: 22px;
}
.blast-button:disabled {
  filter: grayscale(0.9);
  opacity: 0.55;
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.35);
}
.blast-ring {
  position: absolute;
  border: 4px solid rgba(255, 230, 140, 0.9);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  animation: blast-ring 0.6s ease-out forwards;
}
@keyframes blast-ring {
  from {
    width: 20px;
    height: 20px;
    opacity: 1;
  }
  to {
    width: 420px;
    height: 420px;
    opacity: 0;
  }
}
/* Answer audio: one "n 🔊" control per orb, under the target. */
.hvz-listen {
  position: absolute;
  left: 50%;
  top: calc(150px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}
.hvz-listen button {
  min-width: 64px;
  height: 48px;
  border: 3px solid #a5b4fc;
  border-radius: 12px;
  background: #312e81;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
}
.hvz-listen button[data-look='playing'] {
  border-color: #fde68a;
}
.hvz-listen button[data-look='heard'] {
  border-color: #86efac;
}
.hvz-listen button[data-look='failed'] {
  border-color: #fca5a5;
}
.hvz-listen button[data-look='used'] {
  opacity: 0.55;
}
`;
