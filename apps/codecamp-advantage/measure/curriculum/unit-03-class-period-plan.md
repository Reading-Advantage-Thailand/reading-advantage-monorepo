# Unit 03 Class Period Plans: HTML & CSS Crash Course

---

## Period 1: Semantic HTML Structure

**Duration:** ~60 minutes

### Opening (5 min)

- HTML is the skeleton of every web page
- Semantic HTML matters for accessibility and SEO
- Today: build the complete structure of your portfolio with semantic elements

### Activity: HTML Document Anatomy (10 min)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Portfolio</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Content goes here -->
</body>
</html>
```

Key points:
- `<!DOCTYPE html>` — tells the browser this is HTML5
- `<meta charset="UTF-8">` — supports Thai characters
- `<meta name="viewport">` — responsive on mobile

### Activity: Build the Portfolio Structure (30 min)

The intern writes the complete HTML structure — no styling yet:

```html
<body>
  <header>
    <nav>
      <a href="#about">About</a>
      <a href="#skills">Skills</a>
      <a href="#projects">Projects</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main>
    <section id="hero">
      <h1>Your Name</h1>
      <p>Aspiring Web Developer</p>
    </section>

    <section id="about">
      <h2>About Me</h2>
      <p>A short paragraph about yourself.</p>
    </section>

    <section id="skills">
      <h2>Skills</h2>
      <ul>
        <li>HTML</li>
        <li>CSS</li>
        <li>Git</li>
      </ul>
    </section>

    <section id="projects">
      <h2>Projects</h2>
      <article>
        <h3>Personal Portfolio</h3>
        <p>My first website, built with HTML and CSS.</p>
      </article>
    </section>

    <section id="contact">
      <h2>Contact</h2>
      <p>Email me at <a href="mailto:you@example.com">you@example.com</a></p>
    </section>
  </main>

  <footer>
    <p>&copy; 2026 Your Name</p>
  </footer>
</body>
```

Emphasize:
- One `<h1>` per page
- `<section>` for thematic groupings, `<article>` for self-contained content
- `<nav>` for navigation, `<main>` for the primary content
- Links use `href="#id"` for same-page navigation

### Activity: Commit the Structure (10 min)

```bash
git add index.html
git commit -m "feat: add semantic HTML structure for portfolio"
git push
```

### Closing (5 min)

- The portfolio has a skeleton — it's ugly but correct
- Preview: Period 2 adds CSS (colors, fonts, box model)

---

## Period 2: CSS Basics — Selectors, Colors, Box Model

**Duration:** ~60 minutes

### Opening (5 min)

- HTML = structure, CSS = appearance
- Today: link a stylesheet, style the portfolio with colors and spacing

### Activity: Link CSS and Reset Defaults (10 min)

Create `styles.css`:

```css
/* Reset default margins */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #1a1a2e;
  background-color: #fafafa;
}
```

Key points:
- `*` selector targets everything — used for the reset
- `box-sizing: border-box` — padding and border included in width/height (critical!)
- System fonts load instantly (no download needed)

### Activity: Style the Hero and Navigation (20 min)

```css
header {
  background-color: #1a1a2e;
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
}

nav {
  display: flex;
  gap: 1.5rem;
}

nav a {
  color: #fafafa;
  text-decoration: none;
  font-weight: 500;
}

nav a:hover {
  text-decoration: underline;
}

#hero {
  text-align: center;
  padding: 4rem 2rem;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  color: #fafafa;
}

#hero h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}
```

### Activity: The Box Model Deep Dive (15 min)

Draw the box model on screen/whiteboard:

```
┌─────────────── margin ────────────────┐
│  ┌──────── border ────────────────┐   │
│  │  ┌───── padding ──────────┐    │   │
│  │  │      CONTENT           │    │   │
│  │  │                        │    │   │
│  │  └────────────────────────┘    │   │
│  └────────────────────────────────┘   │
└───────────────────────────────────────┘
```

Practice in Chrome DevTools:
1. Right-click the hero → Inspect
2. See the box model visualization in the Computed tab
3. Change padding, margin, border in real time
4. Notice how `box-sizing: border-box` affects calculations

### Activity: Commit (5 min)

```bash
git add styles.css index.html
git commit -m "feat: add CSS styling for hero and navigation"
git push
```

### Closing (5 min)

- Portfolio now has colors and basic styling
- Preview: Period 3 covers Flexbox and Grid layouts

---

## Period 3: Flexbox Layouts

**Duration:** ~60 minutes

### Opening (5 min)

- Flexbox is for 1D layouts — arrange items in a row or column
- Used everywhere in the Reading Advantage UI components

### Activity: Flexbox Fundamentals (20 min)

```css
/* Parent (container) properties */
.container {
  display: flex;
  flex-direction: row;        /* row | column | row-reverse | column-reverse */
  justify-content: flex-start; /* flex-start | center | flex-end | space-between | space-around | space-evenly */
  align-items: stretch;        /* stretch | flex-start | center | flex-end | baseline */
  gap: 1rem;                  /* Space between items */
  flex-wrap: wrap;            /* Allow wrapping */
}

/* Child (item) properties */
.item {
  flex: 1;          /* Grow equally */
  flex: 0 0 200px;  /* Fixed width, don't grow or shrink */
  align-self: center; /* Override align-items for this item */
}
```

Practice: Recreate the Reading Advantage module card layout using Flexbox.

### Activity: Build the Skills Section (20 min)

```css
#skills {
  padding: 3rem 2rem;
  max-width: 800px;
  margin: 0 auto;
}

#skills h2 {
  text-align: center;
  margin-bottom: 2rem;
}

#skills ul {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  list-style: none;
}

#skills li {
  background-color: #e2e8f0;
  padding: 0.5rem 1.5rem;
  border-radius: 9999px;
  font-weight: 500;
}
```

### Activity: Build the Navigation with Flexbox (10 min)

Enhance the nav from Period 2:

```css
nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

nav .logo {
  font-size: 1.25rem;
  font-weight: 700;
}

nav .links {
  display: flex;
  gap: 1.5rem;
}
```

### Activity: Commit (5 min)

```bash
git add styles.css
git commit -m "feat: add Flexbox layouts for skills and navigation"
git push
```

### Closing

- Flexbox mastered for 1D layouts
- Preview: Period 4 covers CSS Grid for 2D layouts

---

## Period 4: CSS Grid Layouts

**Duration:** ~60 minutes

### Opening (5 min)

- Grid is for 2D layouts — rows AND columns simultaneously
- Used for card grids, page layouts, and dashboards

### Activity: Grid Fundamentals (20 min)

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);   /* 3 equal columns */
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Responsive! */
  grid-template-rows: auto;
  gap: 1.5rem;
}

/* Named areas */
.page-layout {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header { grid-area: header; }
.sidebar { grid-area: sidebar; }
main { grid-area: main; }
footer { grid-area: footer; }
```

### Activity: Build the Projects Section (25 min)

```css
#projects {
  padding: 3rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

#projects h2 {
  text-align: center;
  margin-bottom: 2rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.project-card {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1.5rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.project-card h3 {
  margin-bottom: 0.5rem;
}

.project-card p {
  color: #64748b;
  font-size: 0.875rem;
}
```

Add two more `<article>` cards to the projects section so the grid is visible.

### Activity: Commit (5 min)

```bash
git add styles.css index.html
git commit -m "feat: add CSS Grid layout for projects section"
git push
```

### Closing (5 min)

- Grid mastered for 2D layouts
- Preview: Period 5 adds responsive design with media queries

---

## Period 5: Responsive Design

**Duration:** ~60 minutes

### Opening (5 min)

- Mobile-first: write mobile styles first, add breakpoints for larger screens
- The Reading Advantage apps use Tailwind CSS responsive prefixes (sm:, md:, lg:) which follow the same principle

### Activity: Mobile-First Approach (15 min)

The current portfolio probably looks okay on desktop but breaks on mobile. Fix it:

```css
/* Mobile styles are the default (no media query needed) */

/* Tablet (768px+) */
@media (min-width: 768px) {
  #hero h1 {
    font-size: 4rem;
  }

  #skills ul {
    justify-content: flex-start;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  #hero h1 {
    font-size: 5rem;
  }

  .projects-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

### Activity: Responsive Navigation (20 min)

Convert the nav to a hamburger menu on mobile:

```css
/* Hide checkbox */
.nav-toggle {
  display: none;
}

.nav-toggle-label {
  display: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: #fafafa;
}

/* Mobile: show hamburger, hide links */
@media (max-width: 767px) {
  .nav-toggle-label {
    display: block;
  }

  nav .links {
    display: none;
    flex-direction: column;
    width: 100%;
    padding: 1rem 0;
  }

  .nav-toggle:checked ~ .links {
    display: flex;
  }
}
```

Update HTML to include the toggle:
```html
<nav>
  <span class="logo">YN</span>
  <label for="nav-toggle" class="nav-toggle-label">&#9776;</label>
  <input type="checkbox" id="nav-toggle" class="nav-toggle">
  <div class="links">
    <a href="#about">About</a>
    <a href="#skills">Skills</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Contact</a>
  </div>
</nav>
```

### Activity: Test on Multiple Viewports (10 min)

Use Chrome DevTools:
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Test at: 375px (iPhone SE), 768px (iPad), 1440px (Desktop)
3. Check that navigation, grids, and text sizes adapt

### Activity: Commit (5 min)

```bash
git add styles.css index.html
git commit -m "feat: add responsive design with mobile-first media queries"
git push
```

### Closing (5 min)

- Portfolio is now responsive
- Preview: Period 6 wraps up CSS with polish and the quiz

---

## Period 6: Polish, Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- The portfolio is structurally complete and responsive
- Today: polish the details, complete the exercise, and take the quiz

### Activity: Final Polish (20 min)

Add finishing touches:

```css
/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Hover effects on cards */
.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

/* Focus styles for accessibility */
a:focus-visible,
button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Spacing consistency */
section + section {
  padding: 4rem 2rem;
}
```

### Activity: Exercise — Build a Card Layout from a Mockup (25 min)

**Exercise repo:** `codecamp-exercise-html-css`

The intern forks the exercise repo which contains:
- A `design-mockup.png` showing a 3-column card grid with a hero
- An empty `index.html` and `styles.css`
- A README describing the requirements

Requirements:
1. Semantic HTML structure with `<header>`, `<main>`, `<section>`, `<footer>`
2. Hero section with gradient background
3. 3-column card grid using CSS Grid (`repeat(auto-fit, minmax(280px, 1fr))`)
4. Each card has an icon, title, and description
5. Responsive: 1 column on mobile, 2 on tablet, 3 on desktop
6. Hover effect on cards
7. Mobile-first approach

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What does `box-sizing: border-box` do? (includes padding/border in width)
2. When should you use Flexbox vs Grid? (Flexbox for 1D, Grid for 2D)
3. What does `repeat(auto-fit, minmax(280px, 1fr))` create? (responsive grid that auto-adjusts columns)
4. Why write mobile-first CSS? (simpler, progressive enhancement, fewer overrides)
5. Name three semantic HTML elements and what they're for. (`<nav>` = navigation, `<main>` = primary content, `<section>` = thematic grouping)

### Closing

- HTML & CSS unit complete — portfolio looks good
- Next unit: JavaScript Fundamentals — adding interactivity
