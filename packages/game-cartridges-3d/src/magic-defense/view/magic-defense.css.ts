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
.status .md-castles b {
  white-space: nowrap;
}
.status .md-castles i {
  font-style: normal;
}
.status .md-castles i + i {
  margin-left: 8px;
}
/* A phone: the place name, the castle hearts, and the storm button share one short row. */
@media (orientation: portrait), (max-width: 699px) {
  .md-status .place small {
    display: none;
  }
  .md-status .place {
    font-size: 15px;
  }
  .md-status .md-castles {
    font-size: 11px;
  }
  .md-status .md-castles b {
    font-size: 13px;
    letter-spacing: 0;
  }
  .md-status .md-castles i + i {
    margin-left: 5px;
  }
  .md-status .md-storm-name {
    display: none;
  }
  .md-status .md-storm [data-mana]::before {
    content: '⚡ ';
  }
}
.status .md-storm:disabled {
  opacity: 0.6;
}
.status .md-storm.ready {
  background: #ffd84a;
  color: #2a1a00;
}
`;
