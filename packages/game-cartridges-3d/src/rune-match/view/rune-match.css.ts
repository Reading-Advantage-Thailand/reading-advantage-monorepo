// Generated from rune-match.css (the stylesheet text; installed once by installCss).
export default `/* Rune Match 3D: the board sits in the kit card; its size follows the free height of the card. */
.card .rune-find {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  text-align: center;
}
.card .rune-find small {
  font-size: 14px;
  font-weight: 700;
  color: #6a5a7a;
}
.card .rune-find b {
  font-size: 30px;
  line-height: 1.15;
}
.card .board {
  margin: 8px auto 4px;
  width: min(100%, calc((50dvh - 110px) * var(--cols) / var(--rows)));
}
@media (orientation: landscape) and (min-width: 700px) {
  .card .board {
    width: min(100%, calc((100dvh - 230px) * var(--cols) / var(--rows)));
  }
}
.status .shield {
  margin-left: 6px;
}
`;
