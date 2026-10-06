// Generated from hud/theme.css (the stylesheet text; installed once by installCss).
export default `/*
 * The Primary Chibi edition theme: fonts (Fredoka for Latin, Mitr for Thai, the face of the
 * Primary Advantage pages; OFL, see fonts/),
 * color tokens, and shared buttons. A Secondary Epic edition replaces this file only.
 */
@font-face {
  font-family: 'Fredoka';
  src: url('/assets/apk3d/fonts/fredoka-latin.woff2') format('woff2');
  font-weight: 300 700;
  font-display: swap;
}
@font-face {
  font-family: 'Mitr';
  src: url('/assets/apk3d/fonts/mitr-500-thai.woff2') format('woff2');
  font-weight: 300 500;
  unicode-range: U+0E00-0E7F;
  font-display: swap;
}
@font-face {
  font-family: 'Mitr';
  src: url('/assets/apk3d/fonts/mitr-600-thai.woff2') format('woff2');
  font-weight: 600 800;
  unicode-range: U+0E00-0E7F;
  font-display: swap;
}

:root {
  --ink: #2b1d3a;
  --cream: #fff8e8;
  --paper: #fffdf7;
  --gold: #ffd84a;
  --orange: #ff8a1f;
  --purple: #6a3fd1;
  --green: #2fa84f;
  --red: #e0452f;
  --night: #121a2c;
  --font: 'Fredoka', 'Mitr', 'Noto Sans Thai', system-ui, sans-serif;
  --safe-b: env(safe-area-inset-bottom, 0px);
}

/* The :where() keeps the specificity of the button rule at zero, as the old global button rule had, so a
   game's own button styles (word tags, buttons of the HUD) always win over it. */
/* Page-level rules apply only to a standalone page (html.apk3d-page) or inside the game host. They
   must not reach a host app (Primary Advantage), whose own theme owns html, body, and buttons. */
html.apk3d-page *,
.apk3d-story-host,
.apk3d-story-host * {
  box-sizing: border-box;
}
html.apk3d-page,
html.apk3d-page body {
  margin: 0;
  height: 100%;
  background: var(--night);
  color: var(--ink);
  font-family: var(--font);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
.apk3d-story-host {
  background: var(--night);
  color: var(--ink);
  font-family: var(--font);
  -webkit-tap-highlight-color: transparent;
}
:where(html.apk3d-page, .apk3d-story-host, .apk3d-hud) button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}

/* ---------------------------------------------------------------- shared pieces */
.btn {
  border: 0;
  border-radius: 18px;
  padding: 14px 22px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: var(--purple);
  box-shadow: 0 5px 0 #3a1f5c;
  transition: transform 0.06s ease, box-shadow 0.06s ease;
}
.btn:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 #3a1f5c;
}
.btn.gold {
  color: var(--ink);
  background: var(--gold);
  box-shadow: 0 5px 0 #b8841a;
}
.btn.green {
  background: var(--green);
  box-shadow: 0 5px 0 #1d6a31;
}
.btn.ghost {
  background: rgba(255, 255, 255, 0.14);
  box-shadow: none;
}
.btn.soft {
  color: var(--ink);
  background: #efe8fb;
  box-shadow: 0 4px 0 #d8cbef;
}
.btn:disabled {
  opacity: 0.45;
  cursor: default;
}
.pill {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--purple);
}
`;
