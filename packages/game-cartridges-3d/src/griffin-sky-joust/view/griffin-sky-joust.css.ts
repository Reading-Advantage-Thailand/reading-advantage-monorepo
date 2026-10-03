// Generated from griffin-sky-joust.css (the stylesheet text; installed once by installCss).
export default `/* Griffin Sky-Joust HUD: the prompt, the word tags over the riders, and the courage pips. */
.joust-prompt {
  position: absolute;
  left: 50%;
  top: calc(78px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 8px 18px 10px;
  border-radius: 20px;
  background: var(--paper);
  color: var(--ink);
  text-align: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
.joust-prompt small {
  display: block;
  color: #7a6a8a;
  font-size: 13px;
  font-weight: 600;
}
.joust-prompt b {
  display: block;
  font-size: 24px;
  line-height: 1.2;
}
.joust-prompt b.th {
  font-size: 26px;
}
.joust-prompt .sentence-bar {
  position: static;
  transform: none;
  margin-top: 6px;
  padding: 4px 8px;
  max-width: none;
  box-shadow: none;
  background: transparent;
  font-size: 22px;
}
.rider-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  max-width: 132px;
  padding: 3px 10px;
  border: 3px solid #fff;
  border-radius: 12px;
  background: #3a1f5c;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.15;
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
  pointer-events: none;
}
.rider-tag.next {
  border-color: var(--gold);
  background: #7a4d00;
  animation: rider-pulse 0.9s ease-in-out infinite;
}
@keyframes rider-pulse {
  50% {
    transform: translate(-50%, -100%) scale(1.1);
  }
}
.rider-tag.gone {
  opacity: 0.35;
}
.courage-pips {
  display: flex;
  gap: 4px;
  margin-top: 2px;
  justify-content: center;
}
.courage-pips i {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--gold);
  border: 2px solid #fff;
}
.courage-pips i.off {
  background: #555;
}
`;
