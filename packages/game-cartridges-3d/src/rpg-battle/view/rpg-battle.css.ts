// Generated from rpg-battle.css (the stylesheet text; installed once by installCss).
export default `/* RPG Battle 3D: the hand of word cards sits in the kit card. */
.card .rpg-hand {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}
.card .rpg-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 12px 6px;
  border: 3px solid #e2d6f5;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 0 #d8cbef;
  text-align: center;
}
.card .rpg-card:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #d8cbef;
}
.card .rpg-card .ico {
  font-size: 28px;
}
.card .rpg-card b {
  font-size: 22px;
  line-height: 1.15;
  overflow-wrap: anywhere;
}
.card .rpg-card small {
  font-size: 13px;
  font-weight: 700;
  color: #6a5a7a;
}
.card .rpg-card.power {
  border-color: #f0b429;
  background: #fff8e1;
  box-shadow: 0 4px 0 #e3a21a;
}
.card .rpg-card.retry {
  border-style: dashed;
}
.card .rpg-back {
  margin-top: 10px;
}
@media (max-width: 420px) {
  .card .rpg-hand {
    grid-template-columns: 1fr;
  }
  .card .rpg-card {
    flex-direction: row;
    justify-content: center;
    gap: 10px;
  }
}
`;
