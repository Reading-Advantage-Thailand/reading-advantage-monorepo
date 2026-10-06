// Generated from potion-rush.css (the stylesheet text; installed once by installCss).
export default `/* Potion Rush HUD: word tags on the conveyor, cauldron drop zones, order bubbles, the rush sign. */
.word-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  min-width: 44px;
  min-height: 40px;
  padding: 6px 12px;
  border: 3px solid #fff;
  border-radius: 14px;
  background: #2b1d3a;
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
  cursor: grab;
  transition: opacity 0.2s ease;
}
.word-tag.gone {
  opacity: 0;
  pointer-events: none;
}
.word-tag.wrong {
  border-color: var(--red);
  background: #5a1f1f;
}
.drag-ghost.word-tag {
  transform-origin: 0 0;
}
.drop-zone {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 88px;
  height: 88px;
  border: 3px dashed rgba(255, 255, 255, 0);
  border-radius: 50%;
  background: transparent;
  color: #fff;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.dragging-word .drop-zone {
  border-color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.12);
}
.drop-zone .count {
  position: absolute;
  left: 50%;
  bottom: -14px;
  transform: translateX(-50%);
  padding: 1px 8px;
  border-radius: 99px;
  background: rgba(20, 16, 34, 0.8);
  font-size: 13px;
  font-weight: 700;
}
.drop-zone .count:empty {
  display: none;
}
.drop-zone .serve {
  display: none;
  position: absolute;
  left: 50%;
  top: -18px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: 99px;
  background: var(--gold);
  color: var(--ink);
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 4px 0 #b8841a;
  animation: serve-pulse 0.9s ease-in-out infinite;
}
.drop-zone.ready .serve {
  display: block;
}
@keyframes serve-pulse {
  50% {
    transform: translateX(-50%) scale(1.1);
  }
}
.order-bubble {
  position: absolute;
  transform: translate(-50%, -100%);
  max-width: 128px;
  padding: 6px 8px 8px;
  border-radius: 14px;
  background: var(--paper);
  color: var(--ink);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.order-bubble.on {
  opacity: 1;
}
.order-bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -7px;
  margin-left: -7px;
  border: 7px solid transparent;
  border-bottom: 0;
  border-top-color: var(--paper);
}
.order-bubble .mood {
  display: block;
  font-size: 16px;
}
.order-bubble .words span.done {
  color: var(--green);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}
.order-bubble .words span.next {
  padding: 0 3px;
  border-radius: 6px;
  background: var(--gold);
}
.order-bubble .patience {
  display: block;
  height: 5px;
  margin-top: 5px;
  border-radius: 99px;
  background: #e8e0f2;
  overflow: hidden;
}
.order-bubble .patience b {
  display: block;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, var(--orange), var(--green));
}
.rush-sign {
  position: absolute;
  left: 50%;
  top: calc(84px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%) scale(0.6);
  padding: 6px 16px;
  border-radius: 99px;
  background: var(--red);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.rush-sign.on {
  opacity: 1;
  transform: translateX(-50%) scale(1);
  animation: serve-pulse 0.6s ease-in-out infinite;
}
.apk3d-hud .meter.coins b {
  margin-left: 4px;
}
.word-tag,
.grab {
  -webkit-user-select: none;
  user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  cursor: grab;
}
.word-tag.held {
  border-color: var(--gold);
  background: #5b3fa0;
  transform: translate(-50%, -100%) scale(1.12);
}
.grab {
  position: absolute;
  width: 76px;
  height: 64px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}
`;
