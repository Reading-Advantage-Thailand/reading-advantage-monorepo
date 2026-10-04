// Generated from hud/hud.css (the stylesheet text; installed once by installCss).
export default `/*
 * HUD widgets over the 3D stage (see widgets.ts). Colors come from the theme tokens.
 */
.apk3d-hud {
  pointer-events: none;
}
.apk3d-hud > * {
  pointer-events: auto;
}
.anchored {
  position: absolute;
}
.dragging {
  opacity: 0.35;
}
.drag-ghost {
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.35));
}
.hp {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 99px;
  background: rgba(18, 26, 44, 0.8);
  pointer-events: none;
}
.hp i {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--red);
  border: 2px solid #fff;
}
.hp i.off {
  background: #555;
}
.pop {
  position: absolute;
  transform: translate(-50%, -100%);
  font-weight: 700;
  font-size: 26px;
  color: #fff;
  -webkit-text-stroke: 4px #3a1f5c;
  paint-order: stroke fill;
  pointer-events: none;
  animation: pop 1s ease forwards;
}
.pop.miss {
  color: #cfd8ff;
}
.pop.good {
  color: var(--gold);
}
@keyframes pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -60%) scale(0.6);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -110%) scale(1.15);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -190%) scale(1);
  }
}
.banner {
  position: absolute;
  left: 50%;
  top: 22%;
  transform: translate(-50%, -50%);
  width: min(92vw, 520px);
  padding: 14px 18px;
  border-radius: 20px;
  background: rgba(255, 248, 232, 0.97);
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.35s ease;
}
.banner.on {
  opacity: 1;
}
.banner h3 {
  margin: 0;
  font-size: 26px;
  color: var(--purple);
}
.banner p {
  margin: 6px 0 0;
  font-size: 16px;
}

/* The challenge card: the lower part of a portrait screen, the right side of a landscape one. */
.card {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 45%;
  max-height: 58%;
  overflow-y: auto;
  padding: 14px 16px calc(16px + var(--safe-b));
  border-radius: 24px 24px 0 0;
  background: var(--paper);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.35);
  transform: translateY(105%);
  transition: transform 0.3s ease;
}
.card.on {
  transform: translateY(0);
}
@media (orientation: landscape) and (min-width: 700px) {
  .card {
    left: auto;
    top: 64px;
    bottom: 12px;
    right: 12px;
    width: min(44vw, 520px);
    max-height: none;
    border-radius: 24px;
    transform: translateX(110%);
  }
  .card.on {
    transform: translateX(0);
  }
}
.card .who {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #7a6a8a;
}
.card .who .pill {
  font-size: 13px;
}
.card .prompt {
  margin: 8px 0 2px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
}
.card .prompt.small {
  font-size: 22px;
}
.card .ask {
  font-size: 15px;
  color: #6a5a7a;
}
.card .hint2 {
  margin-top: 4px;
  font-size: 15px;
  color: #6a5a7a;
}
.options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
}
.options.one {
  grid-template-columns: 1fr;
}
.opt {
  border: 3px solid #e2d6f5;
  border-radius: 16px;
  padding: 12px 10px;
  background: #fff;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  box-shadow: 0 4px 0 #d8cbef;
  text-align: center;
}
.opt.th {
  font-size: 24px;
}
.opt:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #d8cbef;
}
.opt.right {
  border-color: var(--green);
  background: #e6f8ea;
}
.opt.wrong {
  border-color: var(--red);
  background: #fde8e4;
}
.tray {
  min-height: 56px;
  margin-top: 12px;
  padding: 8px;
  border: 3px dashed #d8cbef;
  border-radius: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tray:empty::before {
  content: attr(data-empty);
  color: #a597bb;
  font-size: 15px;
  padding-left: 6px;
}
.tokens {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.tok {
  border: 3px solid #e2d6f5;
  border-radius: 14px;
  padding: 8px 14px;
  background: #fff;
  font-size: 21px;
  font-weight: 700;
  box-shadow: 0 3px 0 #d8cbef;
}
.tok.used {
  visibility: hidden;
}
.card .actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}
.card .actions .btn {
  flex: 1;
  font-size: 18px;
  padding: 12px;
}
.feedback {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 17px;
  line-height: 1.4;
}
.feedback.good {
  background: #e6f8ea;
}
.feedback.bad {
  background: #fff1d6;
}
.feedback b {
  font-size: 20px;
}
/* The factory's canvas and HUD layer fill the host's game container. */
.apk3d-canvas,
.apk3d-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.apk3d-canvas {
  display: block;
  touch-action: none;
}

/* The status bar at the top of a game: the place, a meter, and round buttons. */
.apk3d-hud .status {
  position: absolute;
  top: max(10px, env(safe-area-inset-top));
  left: 10px;
  right: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  pointer-events: none;
}
.apk3d-hud .place {
  flex: 1;
  padding: 6px 12px;
  border-radius: 14px;
  background: rgba(18, 26, 44, 0.75);
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}
.apk3d-hud .place small {
  display: block;
  color: var(--gold);
  font-size: 12px;
}
.apk3d-hud .meter {
  padding: 6px 10px;
  border-radius: 14px;
  background: rgba(18, 26, 44, 0.75);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.apk3d-hud .meter b {
  display: block;
  font-size: 18px;
  letter-spacing: 1px;
}
.apk3d-hud .book {
  pointer-events: auto;
  border: 0;
  border-radius: 14px;
  padding: 8px 10px;
  background: var(--gold);
  font-weight: 700;
  font-size: 14px;
  box-shadow: 0 3px 0 #b8841a;
}

/* The joystick of arena games (joystick.ts): a touch area under the other controls, and a
   joystick that rests at the bottom left and jumps under the finger. */
.joystick-zone {
  position: absolute;
  inset: 0;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}
.joystick {
  position: absolute;
  width: 112px;
  height: 112px;
  margin: -56px 0 0 -56px;
  border: 3px solid rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: rgba(20, 16, 34, 0.35);
  pointer-events: none;
}
.joystick.rest {
  left: calc(84px + env(safe-area-inset-left, 0px));
  top: calc(100% - 96px - env(safe-area-inset-bottom, 0px));
  opacity: 0.75;
}
.joystick.on {
  opacity: 1;
}
.joystick i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
  transform: translate(-50%, -50%);
}
.joystick span {
  position: absolute;
  left: 50%;
  top: calc(100% + 6px);
  transform: translateX(-50%);
  padding: 2px 10px;
  border-radius: 99px;
  background: rgba(20, 16, 34, 0.7);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.joystick.on span {
  display: none;
}

/* The sentence bar of arena games (sentenceBar in widgets.ts). */
.sentence-bar {
  position: absolute;
  left: 50%;
  top: calc(76px + env(safe-area-inset-top, 0px));
  transform: translateX(-50%);
  /* An element at left: 50% gets only half the width; size to the text instead. */
  width: max-content;
  max-width: calc(100vw - 32px);
  padding: 8px 16px;
  border-radius: 16px;
  background: var(--paper);
  color: var(--ink);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  text-align: center;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}
.sentence-bar .found {
  color: var(--green);
}
.sentence-bar .blank {
  color: #b9a9cc;
  letter-spacing: 1px;
}
.sentence-bar .blank.next {
  color: var(--purple);
  text-decoration: underline;
}
/* A word tag in an arena game; a pinned tag at the screen edge gets an arrow. */
.arena-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  padding: 5px 11px;
  border: 3px solid #fff;
  border-radius: 13px;
  background: #2b1d3a;
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35);
}
.arena-tag.next {
  border-color: var(--gold);
}
.arena-tag.done {
  display: none;
}
.arena-tag[data-edge='left']::before,
.arena-tag[data-edge='right']::after,
.arena-tag[data-edge='up']::before,
.arena-tag[data-edge='down']::after {
  color: var(--gold);
}
.arena-tag[data-edge='left']::before {
  content: '◀ ';
}
.arena-tag[data-edge='right']::after {
  content: ' ▶';
}
.arena-tag[data-edge='up']::before {
  content: '▲ ';
}
.arena-tag[data-edge='down']::after {
  content: ' ▼';
}

/* The swap board (hud/board.ts): tiles in percent of the board, CSS transitions for the moves. */
.board {
  position: relative;
  width: 100%;
  margin: 6px 0 4px;
  border-radius: 16px;
  background: #121a2c;
  touch-action: none;
  user-select: none;
}
.board .rune {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  color: #fff;
  font: 700 clamp(12px, 3.6vw, 18px) / 1.1 var(--font, 'Fredoka', 'Mali', system-ui, sans-serif);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  box-shadow: inset 0 6px 0 rgba(255, 255, 255, 0.18), 0 3px 0 rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: left 0.16s ease-in-out, top 0.16s ease-in-out, transform 0.26s, opacity 0.26s;
  overflow: hidden;
}
.board .rune.long {
  font-size: clamp(10px, 2.9vw, 15px);
}
.board .rune.th {
  font-family: 'Mali', 'Noto Sans Thai', system-ui, sans-serif;
  /* Thai has no spaces: keep one word on one line and shrink it, never break inside a word. */
  font-size: clamp(9px, 2.3vw, 13px);
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}
.board .rune.th.long {
  font-size: clamp(8px, 2vw, 11px);
}
.board .rune.glow {
  box-shadow: 0 0 0 4px rgba(255, 244, 168, 0.75), inset 0 6px 0 rgba(255, 255, 255, 0.18);
}
.board .rune.selected {
  border-color: #ffd84a;
  border-width: 4px;
  transform: scale(1.06);
}
.board .rune.pop {
  transform: scale(1.25);
  opacity: 0;
}
`;
