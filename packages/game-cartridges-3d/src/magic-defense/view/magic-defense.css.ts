// Generated from magic-defense.css (the stylesheet text; installed once by installCss).
export default `/* Magic Defense 3D: the missile label over the caster, the spell buttons of the kit card, the storm button. */
.md-tag {
  position: absolute;
  transform: translate(-50%, -100%);
  max-width: 34vw;
  padding: 4px 12px;
  border: 3px solid #b88cff;
  border-radius: 14px;
  background: rgba(30, 18, 52, 0.9);
  color: #fff;
  text-align: center;
  overflow-wrap: anywhere;
  pointer-events: none;
}
.md-tag small {
  display: block;
  font-size: 11px;
  color: #d9c4ff;
}
.md-tag b {
  font-size: 18px;
  line-height: 1.15;
}
.md-tag.failed {
  border-color: #e0452f;
}
.md-tag.right {
  border-color: #2fa84f;
  background: rgba(31, 107, 53, 0.92);
}
.card .md-spells {
  margin-top: 10px;
}
.card .md-spell:disabled {
  opacity: 0.45;
  text-decoration: line-through;
}
.status .md-storm:disabled {
  opacity: 0.6;
}
.status .md-storm.ready {
  background: #ffd84a;
  color: #2a1a00;
}
`;
