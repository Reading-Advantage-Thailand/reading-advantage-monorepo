// Generated from spellweavers-run.css (the stylesheet text; installed once by installCss).
export default `/* Spellweaver's Run HUD: the prompt, the orb tags, and the courage pips. */
.run-prompt {
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
.run-prompt small {
  display: block;
  color: #7a6a8a;
  font-size: 13px;
  font-weight: 600;
}
.run-prompt b {
  display: block;
  font-size: 24px;
  line-height: 1.2;
}
.run-prompt b.th {
  font-size: 26px;
}
.run-prompt .sentence-bar {
  position: static;
  transform: none;
  margin-top: 6px;
  padding: 4px 8px;
  max-width: none;
  box-shadow: none;
  background: transparent;
  font-size: 22px;
}
.orb-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  max-width: 124px;
  min-height: 46px;
  padding: 6px 14px;
  border: 3px solid #fff;
  border-radius: 14px;
  background: #3a1f5c;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
}
.orb-tag.pulse {
  animation: orb-pulse 0.8s ease-in-out infinite;
}
@keyframes orb-pulse {
  50% {
    transform: translate(-50%, -100%) scale(1.1);
  }
}
.orb-tag.right {
  border-color: var(--green);
  background: #1f7a3a;
}
.orb-tag.wrong {
  border-color: var(--red);
  background: #7a1f1f;
}
.orb-tag.dim {
  opacity: 0.4;
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
