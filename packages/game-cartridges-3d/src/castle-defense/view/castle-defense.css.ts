// Generated from castle-defense.css (the stylesheet text; installed once by installCss).
export default `/* Castle Defense 3D: the hit pips over the attackers, the sentence line, the word and post buttons of the kit card. */
.cd-pips {
  position: absolute;
  transform: translate(-50%, -100%);
  padding: 2px 10px;
  border: 2px solid #f2b84b;
  border-radius: 12px;
  background: rgba(40, 24, 8, 0.88);
  color: #ffd9a0;
  letter-spacing: 2px;
  pointer-events: none;
  transition: opacity 0.3s;
}
.cd-pips.gone {
  opacity: 0;
}
.card .cd-sentence {
  margin: 8px 0 4px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(255, 216, 74, 0.2);
  font-weight: 700;
  line-height: 1.4;
  overflow-wrap: anywhere;
}
.card .cd-words,
.card .cd-posts {
  margin-top: 10px;
}
.card .cd-word:disabled {
  opacity: 0.45;
  text-decoration: line-through;
}
.card .cd-post small {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}
`;
