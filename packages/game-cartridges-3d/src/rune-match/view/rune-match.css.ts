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
/*
 * Portrait: the card takes up to three quarters of the screen and the word sits on one line, so
 * the tiles are wide enough for an eight-letter word (the battle keeps the top of the screen).
 */
@media (orientation: portrait), (max-width: 699px) {
  .card.rune-card {
    max-height: 76%;
    padding: 10px 10px calc(10px + var(--safe-b));
  }
  .card.rune-card .rune-find {
    flex-flow: row wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0 8px;
  }
  .card.rune-card .rune-find b {
    font-size: 26px;
  }
  .card.rune-card .board {
    width: min(100%, calc((76dvh - 84px) * var(--cols) / var(--rows)));
  }
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
