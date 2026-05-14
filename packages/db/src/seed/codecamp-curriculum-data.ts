// Pure data module for the Phase A codecamp curriculum.
// Separated from the seed script so it can be tested independently.

export interface CurriculumLesson {
  title: string;
  description: string;
  order: number;
  type: "theory" | "exercise" | "quiz";
  contentJson: Record<string, unknown>;
  exercises?: Array<{
    title: string;
    instructions: string;
    starterCode: string | null;
    expectedOutput: string | null;
    hintsJson: string[];
    order: number;
  }>;
  questions?: Array<{
    question: string;
    optionsJson: string[];
    correctAnswer: string;
    explanation: string;
    order: number;
  }>;
}

export interface CurriculumModule {
  title: string;
  description: string;
  slug: string;
  order: number;
  phase: "A" | "B" | "C" | "D";
  status: "published" | "draft";
  lessons: CurriculumLesson[];
}

export interface CurriculumRepo {
  moduleSlug: string;
  repoUrl: string;
  description: string;
  order: number;
}

export function getPhaseACurriculumData() {
  const modules: CurriculumModule[] = [
    // ─── Module 1: Dev Environment Setup ──────────────────────
    {
      title: "Dev Environment Setup",
      description:
        "Set up the complete development environment: terminal, Node.js 20, pnpm 8.15.8, VS Code, and essential extensions.",
      slug: "dev-environment",
      order: 1,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Terminal, Node.js, and pnpm",
          description:
            "Learn terminal basics, install Node.js 20, and set up pnpm 8.15.8 — the package manager used across the Reading Advantage monorepo.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Terminal Basics",
                body: "The terminal is where you type commands to control your computer. Every Reading Advantage developer uses the terminal daily. Key commands: pwd (where am I?), ls (what's here?), cd (change directory), mkdir (make directory), cat (show file contents).",
                code: "# Navigation\npwd                          # Where am I?\nls                           # What's here?\ncd Desktop                   # Go to Desktop\ncd ..                        # Go back up\nmkdir codecamp               # Create workspace folder\ncd codecamp\n\n# File operations\necho \"Hello, codecamp!\" > hello.txt\ncat hello.txt\nmkdir projects\nmv hello.txt projects/\nls projects/\nrm projects/hello.txt\nrmdir projects",
              },
              {
                heading: "Install Node.js 20",
                body: "Node.js is the JavaScript runtime that powers the monorepo. We use Node.js 20 LTS. You can download it from nodejs.org or use nvm (Node Version Manager).",
                code: "# Verify Node.js installation\nnode --version   # v20.x.x\nnpm --version    # 10.x.x\n\n# Run a quick script\nnode -e \"console.log('Node.js is working!')\"",
              },
              {
                heading: "Install pnpm 8.15.8",
                body: "pnpm is the package manager used by the entire Reading Advantage monorepo. It is faster than npm, uses less disk space, and enforces strict dependency isolation (no phantom dependencies). Node.js 20 ships with corepack, which makes installing pnpm easy.",
                code: "# Enable corepack and install pnpm\ncorepack enable\ncorepack prepare pnpm@8.15.8 --activate\n\n# Verify\npnpm --version   # 8.15.8",
              },
            ],
          },
        },
        {
          title: "Dev Environment Quiz",
          description:
            "Test your understanding of the development environment setup.",
          order: 2,
          type: "quiz",
          contentJson: {
            instructions: "Answer all questions to complete this lesson.",
          },
          questions: [
            {
              question: "What command shows your current directory?",
              optionsJson: ["ls", "cd", "pwd", "mkdir"],
              correctAnswer: "pwd",
              explanation:
                "`pwd` (print working directory) shows the full path of your current directory.",
              order: 1,
            },
            {
              question:
                "What version of Node.js does the Reading Advantage monorepo use?",
              optionsJson: ["16", "18", "20", "22"],
              correctAnswer: "20",
              explanation:
                "The monorepo uses Node.js 20 LTS, as documented in the tech stack.",
              order: 2,
            },
            {
              question:
                "Why does the monorepo use pnpm instead of npm? (Choose the best answer)",
              optionsJson: [
                "It is slower but more reliable",
                "Faster installs, strict dependency isolation, no phantom deps",
                "It is the default in Node.js",
                "It uses more disk space",
              ],
              correctAnswer:
                "Faster installs, strict dependency isolation, no phantom deps",
              explanation:
                "pnpm is content-addressable (faster), creates hard links (saves disk), and strictly isolates dependencies (prevents phantom dependency bugs).",
              order: 3,
            },
            {
              question: "What does `pnpm install` do?",
              optionsJson: [
                "Runs the dev server",
                "Installs all workspace dependencies",
                "Compiles TypeScript",
                "Runs tests",
              ],
              correctAnswer: "Installs all workspace dependencies",
              explanation:
                "`pnpm install` reads the monorepo's pnpm-workspace.yaml and installs dependencies for all packages and apps.",
              order: 4,
            },
            {
              question:
                "What VS Code extension provides format-on-save functionality?",
              optionsJson: ["ESLint", "Prettier", "GitLens", "Tailwind CSS IntelliSense"],
              correctAnswer: "Prettier",
              explanation:
                "The Prettier extension formats code automatically when you save a file.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 2: Git & GitHub Fundamentals ──────────────────
    {
      title: "Git & GitHub Fundamentals",
      description:
        "Master version control with Git and collaboration with GitHub: init, add, commit, push, branching, forking, pull requests, and Issues.",
      slug: "git-github",
      order: 2,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Git Basics — init, add, commit",
          description:
            "Learn the core Git workflow: initialize a repository, stage changes, commit with Conventional Commits, and view history.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Create Your First Repo",
                body: "Git is a version control system that tracks changes to your code. It lets you undo mistakes, collaborate with others, and see the history of every change.",
                code: "mkdir personal-portfolio\ncd personal-portfolio\ngit init\n\n# Create a file and commit it\necho \"Hello\" > index.html\ngit add index.html\ngit status              # See what's staged\ngit commit -m \"feat: add initial portfolio page\"",
              },
              {
                heading: "The Git Cycle",
                body: "The daily Git workflow is simple: make changes, stage them, commit them. Use `git log --oneline` to see your history.",
                code: "| Command | What it does |\n|---------|-------------|\n| `git status` | Show changed/staged/untracked files |\n| `git add <file>` | Stage changes for commit |\n| `git add .` | Stage all changes |\n| `git commit -m \"msg\"` | Commit staged changes |\n| `git log --oneline` | View commit history |",
              },
              {
                heading: "Conventional Commits",
                body: "Reading Advantage uses Conventional Commits to keep history readable. The format is `type(scope): description`. Common types: feat (new feature), fix (bug fix), chore (tooling), docs (documentation), refactor (restructure without behavior change).",
                code: 'feat: add contact form\nfix: correct navigation link\nchore: add .gitignore\ndocs: update README',
              },
            ],
          },
        },
        {
          title: "GitHub — Remote Repos, Push, Pull",
          description:
            "Connect your local repository to GitHub, push commits, pull updates, and understand remotes.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Push to GitHub",
                body: "GitHub is a hosting service for Git repositories. After creating a repo on GitHub, you connect your local repo and push your commits.",
                code: "git remote add origin https://github.com/<username>/personal-portfolio.git\ngit branch -M main\ngit push -u origin main\n\n# Daily workflow\ngit add .\ngit commit -m \"feat: add about section\"\ngit push",
              },
              {
                heading: "Understanding Remotes",
                body: "`origin` is just a name (convention) for the remote URL. `-u` sets the upstream tracking branch so future `git push` calls know where to go.",
                code: "git remote -v              # Show remote URLs\ngit fetch                  # Download without merging\ngit pull                   # Fetch + merge\ngit push                   # Upload commits",
              },
              {
                heading: "GitHub Issues",
                body: "Every change at Reading Advantage starts with a GitHub Issue. Issues track bugs, features, and tasks. You create an Issue, then later open a Pull Request that references it with 'Closes #3'.",
                code: "# Example Issue title\nAdd contact information\n\n# Example PR description\nCloses #3\n\nThis PR adds an email link to the portfolio.",
              },
            ],
          },
        },
        {
          title: "Branching, Forking, Pull Requests",
          description:
            "Work in isolation with branches, contribute to others' repos with forks, and propose changes via Pull Requests.",
          order: 3,
          type: "exercise",
          contentJson: {
            instructions:
              "Practice branching, forking, and opening a Pull Request. Fork the practice repo, create a branch, make a change, and open a PR.",
          },
          exercises: [
            {
              title: "Branch and merge practice",
              instructions:
                "Create a feature branch, make a change to your portfolio, commit it, merge it back to main, and delete the branch.",
              starterCode:
                "git switch -c feat/add-skills-section\n# Edit index.html to add a skills section\ngit add index.html\ngit commit -m \"feat: add skills section\"\ngit switch main\ngit merge feat/add-skills-section\ngit branch -d feat/add-skills-section",
              expectedOutput:
                "A new skills section in your portfolio, committed and merged to main",
              hintsJson: [
                "Use `git switch -c` to create and switch to a new branch",
                "Commit with a conventional commit message",
                "Delete the branch after merging to keep things tidy",
              ],
              order: 1,
            },
          ],
        },
        {
          title: "Git & GitHub Quiz",
          description:
            "Test your understanding of Git and GitHub fundamentals.",
          order: 4,
          type: "quiz",
          contentJson: {
            instructions: "Answer all questions to complete this lesson.",
          },
          questions: [
            {
              question: "What is the difference between `git fetch` and `git pull`?",
              optionsJson: [
                "They are the same command",
                "fetch downloads only; pull downloads and merges",
                "fetch merges; pull downloads only",
                " Neither downloads anything",
              ],
              correctAnswer: "fetch downloads only; pull downloads and merges",
              explanation:
                "`git fetch` downloads commits from the remote without changing your local branch. `git pull` is fetch + merge in one step.",
              order: 1,
            },
            {
              question:
                "What branch naming convention does Reading Advantage use?",
              optionsJson: [
                "username/feature-name",
                "type/description, e.g., feat/add-contact",
                "date-feature-name",
                "JIRA-ticket-number",
              ],
              correctAnswer: "type/description, e.g., feat/add-contact",
              explanation:
                "Reading Advantage follows Conventional Commits style for branch names too: `feat/description`, `fix/description`, `chore/description`.",
              order: 2,
            },
            {
              question:
                "How do you propose changes to a repository you do not own?",
              optionsJson: [
                "Clone and push directly",
                "fork → branch → PR",
                "Email the owner",
                "Create an Issue only",
              ],
              correctAnswer: "fork → branch → PR",
              explanation:
                "You fork the repo (create your own copy), make changes on a branch in your fork, then open a Pull Request from your fork to the original repo.",
              order: 3,
            },
            {
              question: 'What does "Closes #3" in a PR description do?',
              optionsJson: [
                "Deletes issue #3",
                "Auto-closes Issue #3 when the PR is merged",
                "Creates a new issue #3",
                "Nothing special",
              ],
              correctAnswer: "Auto-closes Issue #3 when the PR is merged",
              explanation:
                "GitHub recognizes keywords like 'Closes', 'Fixes', and 'Resolves' followed by an issue number. When the PR merges, the issue is automatically closed.",
              order: 4,
            },
            {
              question: "When should you use `git stash`?",
              optionsJson: [
                "To delete uncommitted work",
                "To temporarily save uncommitted work so you can switch branches",
                "To commit changes",
                "To push to remote",
              ],
              correctAnswer:
                "To temporarily save uncommitted work so you can switch branches",
              explanation:
                "`git stash` saves your uncommitted changes to a stack, cleans your working directory, and lets you switch branches. Use `git stash pop` to restore them later.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 3: HTML & CSS Crash Course ────────────────────
    {
      title: "HTML & CSS Crash Course",
      description:
        "Build the structure and style of your portfolio website with semantic HTML, CSS box model, Flexbox, Grid, and responsive design.",
      slug: "html-css",
      order: 3,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Semantic HTML Structure",
          description:
            "Build the complete structure of your portfolio with semantic HTML elements: header, nav, main, section, article, footer.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "HTML Document Anatomy",
                body: "Every HTML document has a standard structure. The `<!DOCTYPE html>` declaration tells the browser this is HTML5. The `<meta charset=\"UTF-8\">` supports Thai characters. The `<meta name=\"viewport\">` makes the page responsive on mobile.",
                code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My Portfolio</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <!-- Content goes here -->\n</body>\n</html>',
              },
              {
                heading: "Build the Portfolio Structure",
                body: "Semantic HTML uses tags that describe the meaning of the content, not just how it looks. This helps screen readers, search engines, and other developers understand your page.",
                code: '<body>\n  <header>\n    <nav>\n      <a href="#about">About</a>\n      <a href="#skills">Skills</a>\n      <a href="#projects">Projects</a>\n      <a href="#contact">Contact</a>\n    </nav>\n  </header>\n\n  <main>\n    <section id="hero">\n      <h1>Your Name</h1>\n      <p>Aspiring Web Developer</p>\n    </section>\n\n    <section id="about">\n      <h2>About Me</h2>\n      <p>A short paragraph about yourself.</p>\n    </section>\n\n    <section id="skills">\n      <h2>Skills</h2>\n      <ul>\n        <li>HTML</li>\n        <li>CSS</li>\n        <li>Git</li>\n      </ul>\n    </section>\n  </main>\n\n  <footer>\n    <p>&copy; 2026 Your Name</p>\n  </footer>\n</body>',
              },
            ],
          },
        },
        {
          title: "CSS Basics — Selectors, Colors, Box Model",
          description:
            "Learn to style your portfolio with CSS: selectors, colors, fonts, and the critical box-sizing property.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Link CSS and Reset Defaults",
                body: "CSS controls the appearance of HTML elements. The `*` selector targets everything. `box-sizing: border-box` is critical — it makes padding and border included in the element's total width and height.",
                code: "/* Reset default margins */\n* {\n  margin: 0;\n  padding: 0;\n  box-sizing: border-box;\n}\n\nbody {\n  font-family: system-ui, -apple-system, sans-serif;\n  line-height: 1.6;\n  color: #1a1a2e;\n  background-color: #fafafa;\n}",
              },
              {
                heading: "Style the Hero and Navigation",
                body: "Use CSS to add colors, spacing, and visual hierarchy. The `position: sticky` property keeps the header visible as you scroll.",
                code: "header {\n  background-color: #1a1a2e;\n  padding: 1rem 2rem;\n  position: sticky;\n  top: 0;\n}\n\nnav {\n  display: flex;\n  gap: 1.5rem;\n}\n\nnav a {\n  color: #fafafa;\n  text-decoration: none;\n  font-weight: 500;\n}\n\n#hero {\n  text-align: center;\n  padding: 4rem 2rem;\n  background: linear-gradient(135deg, #1a1a2e, #16213e);\n  color: #fafafa;\n}",
              },
              {
                heading: "The Box Model",
                body: "Every HTML element is a box with four layers: content, padding, border, and margin. Understanding the box model is essential for layout. Use Chrome DevTools to inspect the box model of any element.",
                code: "/* Box model visualization */\n.box {\n  width: 300px;        /* content width */\n  padding: 20px;       /* space inside the border */\n  border: 2px solid;   /* the border itself */\n  margin: 10px;        /* space outside the border */\n}",
              },
            ],
          },
        },
        {
          title: "Flexbox Layouts",
          description:
            "Master one-dimensional layouts with CSS Flexbox: alignment, direction, wrapping, and gap.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Flexbox Fundamentals",
                body: "Flexbox is for 1D layouts — arranging items in a row or a column. It is used everywhere in the Reading Advantage UI components.",
                code: "/* Parent (container) properties */\n.container {\n  display: flex;\n  flex-direction: row;\n  justify-content: flex-start;\n  align-items: stretch;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n\n/* Child (item) properties */\n.item {\n  flex: 1;\n  align-self: center;\n}",
              },
              {
                heading: "Build the Skills Section",
                body: "Use Flexbox to create a responsive skills list that wraps on smaller screens.",
                code: "#skills ul {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: center;\n  gap: 1rem;\n  list-style: none;\n}\n\n#skills li {\n  background-color: #e2e8f0;\n  padding: 0.5rem 1.5rem;\n  border-radius: 9999px;\n  font-weight: 500;\n}",
              },
            ],
          },
        },
        {
          title: "CSS Grid Layouts",
          description:
            "Master two-dimensional layouts with CSS Grid: columns, rows, named areas, and responsive grids.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Grid Fundamentals",
                body: "Grid is for 2D layouts — rows AND columns simultaneously. Use `repeat(auto-fit, minmax(300px, 1fr))` for responsive grids that automatically adjust the number of columns.",
                code: ".grid-container {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n  gap: 1.5rem;\n}\n\n/* Named areas */\n.page-layout {\n  display: grid;\n  grid-template-areas:\n    'header header'\n    'sidebar main'\n    'footer footer';\n  grid-template-columns: 250px 1fr;\n  min-height: 100vh;\n}",
              },
              {
                heading: "Build the Projects Section",
                body: "Create a responsive card grid for your portfolio projects.",
                code: ".projects-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));\n  gap: 1.5rem;\n}\n\n.project-card {\n  border: 1px solid #e2e8f0;\n  border-radius: 0.5rem;\n  padding: 1.5rem;\n  background: white;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}",
              },
            ],
          },
        },
        {
          title: "Responsive Design",
          description:
            "Make your portfolio look great on every device with mobile-first media queries.",
          order: 5,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Mobile-First Approach",
                body: "Write mobile styles first (no media query needed), then add breakpoints for larger screens. The Reading Advantage apps use Tailwind CSS responsive prefixes (sm:, md:, lg:) which follow the same principle.",
                code: "/* Mobile styles are the default */\n#hero h1 {\n  font-size: 2rem;\n}\n\n/* Tablet (768px+) */\n@media (min-width: 768px) {\n  #hero h1 {\n    font-size: 4rem;\n  }\n}\n\n/* Desktop (1024px+) */\n@media (min-width: 1024px) {\n  #hero h1 {\n    font-size: 5rem;\n  }\n  .projects-grid {\n    grid-template-columns: repeat(3, 1fr);\n  }\n}",
              },
              {
                heading: "Test on Multiple Viewports",
                body: "Use Chrome DevTools to test responsiveness. Open DevTools, toggle the device toolbar (Ctrl+Shift+M), and test at common breakpoints: 375px (iPhone SE), 768px (iPad), 1440px (Desktop).",
                code: "/* Common breakpoints used in the monorepo */\n/* sm: 640px, md: 768px, lg: 1024px, xl: 1280px */",
              },
            ],
          },
        },
        {
          title: "HTML & CSS Exercise + Quiz",
          description:
            "Build a card layout from a mockup and test your HTML & CSS knowledge.",
          order: 6,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the card layout exercise by building a responsive 3-column card grid with a hero section, using semantic HTML and CSS Grid.",
          },
          exercises: [
            {
              title: "Build a Card Layout from a Mockup",
              instructions:
                "Fork the exercise repo and build a responsive card layout: semantic HTML structure, hero with gradient background, 3-column CSS Grid, hover effects, and mobile-first responsive design.",
              starterCode:
                '<!-- index.html -->\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Card Layout</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <!-- TODO: Build the layout -->\n</body>\n</html>',
              expectedOutput:
                "A responsive page with a hero section and a 3-column card grid",
              hintsJson: [
                "Use `<header>`, `<main>`, `<section>`, and `<footer>` for semantic structure",
                "Use `display: grid` with `repeat(auto-fit, minmax(280px, 1fr))` for the card grid",
                "Add hover effects with `transform: translateY(-2px)` and `box-shadow`",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What does `box-sizing: border-box` do?",
              optionsJson: [
                "Removes all padding and borders",
                "Includes padding and border in the element's total width and height",
                "Makes the box invisible",
                "Centers the box on the page",
              ],
              correctAnswer:
                "Includes padding and border in the element's total width and height",
              explanation:
                "Without border-box, padding and border are added outside the declared width. With border-box, they are included inside, making width calculations predictable.",
              order: 1,
            },
            {
              question: "When should you use Flexbox vs Grid?",
              optionsJson: [
                "Flexbox for 2D, Grid for 1D",
                "Flexbox for 1D, Grid for 2D",
                "Always use Grid",
                "Always use Flexbox",
              ],
              correctAnswer: "Flexbox for 1D, Grid for 2D",
              explanation:
                "Flexbox is for arranging items in a single row or column (1D). Grid is for layouts with rows AND columns (2D).",
              order: 2,
            },
            {
              question:
                "What does `repeat(auto-fit, minmax(280px, 1fr))` create?",
              optionsJson: [
                "A fixed 3-column grid",
                "A responsive grid that auto-adjusts columns based on available space",
                "A single column layout",
                "A grid with no gaps",
              ],
              correctAnswer:
                "A responsive grid that auto-adjusts columns based on available space",
              explanation:
                "`auto-fit` fills the row with as many columns as fit. `minmax(280px, 1fr)` means each column is at least 280px and grows equally to fill space.",
              order: 3,
            },
            {
              question: "Why write mobile-first CSS?",
              optionsJson: [
                "It is required by all browsers",
                "Simpler, progressive enhancement, fewer overrides",
                "Mobile devices are faster",
                "Desktop CSS does not work on mobile",
              ],
              correctAnswer: "Simpler, progressive enhancement, fewer overrides",
              explanation:
                "Mobile-first means you write the base styles for small screens, then use `min-width` media queries to add complexity for larger screens. This avoids overriding desktop styles for mobile.",
              order: 4,
            },
            {
              question:
                "Name three semantic HTML elements and what they are for.",
              optionsJson: [
                "<div>, <span>, <i> — all for styling",
                "<nav> = navigation, <main> = primary content, <section> = thematic grouping",
                "<b>, <u>, <s> — all for text decoration",
                "<table>, <tr>, <td> — all for tabular data only",
              ],
              correctAnswer:
                "<nav> = navigation, <main> = primary content, <section> = thematic grouping",
              explanation:
                "Semantic elements describe the meaning of the content. `<nav>` is for navigation links, `<main>` is for the primary content of the page, and `<section>` is for thematic groupings.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 4: JavaScript Fundamentals ────────────────────
    {
      title: "JavaScript Fundamentals",
      description:
        "Add interactivity to your portfolio with JavaScript: variables, functions, DOM manipulation, events, arrays, objects, async/await, and the Fetch API.",
      slug: "javascript",
      order: 4,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Variables, Types, Operators",
          description:
            "Learn JavaScript variables (const, let), data types, and operators. Understand why `var` is never used in modern code.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Variables — const, let, never var",
                body: "Use `const` by default. Use `let` only when you need to reassign. Never use `var` — it has function scope instead of block scope, which causes bugs.",
                code: "// const — cannot be reassigned (use by default)\nconst name = \"Alice\";\nconst PI = 3.14159;\n\n// let — can be reassigned (use only when needed)\nlet score = 0;\nscore = 10; // OK\n\n// var — NEVER USE THIS\n// var age = 25; // Don't do this",
              },
              {
                heading: "Data Types",
                body: "JavaScript has primitives (string, number, boolean, null, undefined) and reference types (array, object). Use `typeof` to check types.",
                code: "// Primitives\nconst str = \"Hello\";\nconst num = 42;\nconst bool = true;\nconst nothing = null;\nconst notDefined = undefined;\n\n// Reference types\nconst arr = [1, 2, 3];\nconst obj = { name: \"Alice\", age: 20 };\n\n// typeof\ntypeof str;        // \"string\"\ntypeof num;        // \"number\"\ntypeof bool;       // \"boolean\"",
              },
              {
                heading: "Operators",
                body: "Use strict equality (`===`) instead of loose equality (`==`). Use nullish coalescing (`??`) for defaults.",
                code: "// Comparison — ALWAYS use strict equality\n1 === 1;    // true\n1 == \"1\";   // true (loose — avoid!)\n1 !== 2;    // true\n\n// Nullish coalescing\nconst value = null ?? \"default\";  // \"default\"\nconst zero = 0 ?? \"default\";      // 0 (respects 0 and \"\")",
              },
            ],
          },
        },
        {
          title: "Functions and Scope",
          description:
            "Write reusable code with function declarations, expressions, and arrow functions. Understand block scope and closures.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Function Declarations vs Expressions vs Arrow",
                body: "Arrow functions are concise and preferred for callbacks. Function declarations are hoisted. Function expressions are not.",
                code: "// Function declaration (hoisted)\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\n// Function expression (not hoisted)\nconst greet2 = function (name) {\n  return `Hello, ${name}!`;\n};\n\n// Arrow function (concise, preferred for callbacks)\nconst greet3 = (name) => `Hello, ${name}!`;\n\n// Default parameters\nconst greet4 = (name = \"World\") => `Hello, ${name}!`;",
              },
              {
                heading: "Scope and Closures",
                body: "Variables declared with `const` and `let` are block-scoped. A closure is a function that remembers its outer scope even after the outer function has returned.",
                code: "// Block scope\nif (true) {\n  const block = \"I'm in the if block\";\n  console.log(block); // OK\n}\n// console.log(block); // ReferenceError!\n\n// Closure\nfunction createCounter() {\n  let count = 0;\n  return () => {\n    count += 1;\n    return count;\n  };\n}\nconst counter = createCounter();\ncounter(); // 1\ncounter(); // 2",
              },
            ],
          },
        },
        {
          title: "DOM Manipulation",
          description:
            "Select, create, modify, and remove DOM elements to make your portfolio interactive.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Selecting Elements",
                body: "Use `document.querySelector` for single elements and `document.querySelectorAll` for multiple elements. These accept any CSS selector.",
                code: "// By ID\nconst hero = document.getElementById(\"hero\");\n\n// By CSS selector (first match)\nconst firstLink = document.querySelector(\"nav a\");\n\n// By CSS selector (all matches)\nconst allSections = document.querySelectorAll(\"section\");",
              },
              {
                heading: "Modifying Elements",
                body: "Change text, HTML, styles, classes, and attributes dynamically.",
                code: "// Change text\nhero.querySelector(\"h1\").textContent = \"Updated Name\";\n\n// Add/remove/toggle classes\nhero.classList.add(\"highlight\");\nhero.classList.remove(\"highlight\");\nhero.classList.toggle(\"highlight\");\n\n// Change attributes\ndocument.querySelector(\"nav a\").setAttribute(\"href\", \"#hero\");",
              },
              {
                heading: "Building a Dark Mode Toggle",
                body: "Create a button that toggles a dark mode class on the body element.",
                code: "const toggleButton = document.createElement(\"button\");\ntoggleButton.textContent = \"🌙 Dark Mode\";\ndocument.querySelector(\"header\").appendChild(toggleButton);\n\ntoggleButton.addEventListener(\"click\", () => {\n  document.body.classList.toggle(\"dark-mode\");\n  const isDark = document.body.classList.contains(\"dark-mode\");\n  toggleButton.textContent = isDark ? \"☀️ Light Mode\" : \"🌙 Dark Mode\";\n});",
              },
            ],
          },
        },
        {
          title: "Events and Form Handling",
          description:
            "Handle user interactions with event listeners and build a contact form with client-side validation.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Event Listeners",
                body: "Events tell JavaScript that something happened: clicks, key presses, form submissions, scroll, resize. Always use `event.preventDefault()` to stop default behavior when needed.",
                code: "// Basic click\nbutton.addEventListener(\"click\", () => {\n  console.log(\"Clicked!\");\n});\n\n// Prevent default behavior\nform.addEventListener(\"submit\", (event) => {\n  event.preventDefault();\n  console.log(\"Form submitted!\");\n});\n\n// Event delegation\ndocument.querySelector(\"nav\").addEventListener(\"click\", (event) => {\n  if (event.target.tagName === \"A\") {\n    console.log(`Navigating to ${event.target.getAttribute(\"href\")}`);\n  }\n});",
              },
              {
                heading: "Form Validation",
                body: "Validate form inputs before submission. Check for empty values, valid email format, and minimum length.",
                code: "form.addEventListener(\"submit\", (event) => {\n  event.preventDefault();\n  const name = form.name.value.trim();\n  const email = form.email.value.trim();\n\n  if (!name || !email) {\n    status.textContent = \"Please fill in all fields.\";\n    return;\n  }\n\n  if (!email.includes(\"@\")) {\n    status.textContent = \"Please enter a valid email.\";\n    return;\n  }\n\n  status.textContent = `Thanks, ${name}! Message received.`;\n  form.reset();\n});",
              },
            ],
          },
        },
        {
          title: "Arrays and Objects",
          description:
            "Master the data structures you will use every day: array methods (map, filter, find, reduce) and object manipulation.",
          order: 5,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Array Methods",
                body: "Array methods are used constantly in React. `map` transforms, `filter` selects, `find` gets the first match, `reduce` accumulates.",
                code: "const skills = [\"HTML\", \"CSS\", \"JavaScript\", \"Git\"];\n\n// map — transform each element\nconst upper = skills.map((s) => s.toUpperCase());\n\n// filter — keep matches\nconst long = skills.filter((s) => s.length > 3);\n\n// find — first match\nconst js = skills.find((s) => s.includes(\"Java\"));\n\n// reduce — accumulate\nconst totalLength = skills.reduce((sum, s) => sum + s.length, 0);",
              },
              {
                heading: "Objects and Destructuring",
                body: "Use dot notation and bracket notation to access properties. Destructure objects for cleaner code. Use the spread operator to copy and merge.",
                code: "const project = {\n  title: \"Portfolio\",\n  technologies: [\"HTML\", \"CSS\"],\n  status: \"in-progress\",\n};\n\n// Destructuring\nconst { title, status } = project;\n\n// Spread operator\nconst updated = {\n  ...project,\n  status: \"completed\",\n  url: \"https://example.com\",\n};",
              },
            ],
          },
        },
        {
          title: "Async/Await and Promises",
          description:
            "Write non-blocking code with Promises and async/await. Handle errors with try/catch.",
          order: 6,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Understanding Promises",
                body: "A Promise represents a value that will be available later. It has three states: pending, fulfilled, or rejected. Prefer `async/await` over `.then()` for readability.",
                code: "// Creating a promise\nconst delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));\n\n// Using async/await (preferred)\nconst example = async () => {\n  await delay(1000);\n  console.log(\"1 second later\");\n};",
              },
              {
                heading: "Error Handling with try/catch",
                body: "Always use try/catch with async/await. Always check `response.ok` — fetch does not throw on 404 or 500.",
                code: "const fetchUserData = async (userId) => {\n  try {\n    const response = await fetch(`/api/users/${userId}`);\n    if (!response.ok) {\n      throw new Error(`HTTP ${response.status}`);\n    }\n    return await response.json();\n  } catch (error) {\n    console.error(\"Failed to fetch:\", error.message);\n    return null;\n  }\n};",
              },
            ],
          },
        },
        {
          title: "Fetch API and Error Handling",
          description:
            "Make HTTP requests with the Fetch API. Handle GET, POST, PUT, DELETE and build robust error handling patterns.",
          order: 7,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "HTTP Methods with Fetch",
                body: "The Fetch API is built into modern browsers. Use it to read data (GET), create data (POST), update data (PUT/PATCH), and delete data (DELETE).",
                code: "// GET\nconst getProjects = async () => {\n  const response = await fetch(\"/api/projects\");\n  return response.json();\n};\n\n// POST\nconst createProject = async (project) => {\n  const response = await fetch(\"/api/projects\", {\n    method: \"POST\",\n    headers: { \"Content-Type\": \"application/json\" },\n    body: JSON.stringify(project),\n  });\n  return response.json();\n};\n\n// DELETE\nconst deleteProject = async (id) => {\n  const response = await fetch(`/api/projects/${id}`, {\n    method: \"DELETE\",\n  });\n  if (!response.ok) throw new Error(\"Delete failed\");\n};",
              },
              {
                heading: "Robust Error Handling",
                body: "Create a reusable fetch wrapper that handles network errors, parses JSON, and throws descriptive errors.",
                code: "class ApiError extends Error {\n  constructor(status, message) {\n    super(message);\n    this.status = status;\n    this.name = \"ApiError\";\n  }\n}\n\nconst apiFetch = async (url, options = {}) => {\n  try {\n    const response = await fetch(url, {\n      ...options,\n      headers: { \"Content-Type\": \"application/json\", ...options.headers },\n    });\n    if (!response.ok) {\n      const body = await response.json().catch(() => ({}));\n      throw new ApiError(response.status, body.message || response.statusText);\n    }\n    return response.status === 204 ? null : response.json();\n  } catch (error) {\n    if (error instanceof ApiError) throw error;\n    throw new ApiError(0, `Network error: ${error.message}`);\n  }\n};",
              },
            ],
          },
        },
        {
          title: "JavaScript Exercise + Quiz",
          description:
            "Build a dynamic searchable list and test your JavaScript knowledge.",
          order: 8,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the JavaScript exercise by building a dynamic, searchable user list with fetch, async/await, and array methods.",
          },
          exercises: [
            {
              title: "Build a Dynamic Searchable List",
              instructions:
                "Fork the exercise repo and build a dynamic user list: fetch JSON data, render cards, add real-time search filtering, add department filter buttons, handle errors gracefully, and use arrow functions throughout.",
              starterCode:
                "// TODO: Fetch users.json\n// TODO: Render users as cards\n// TODO: Add search input with 'input' event listener\n// TODO: Add department filter buttons\n// TODO: Handle fetch errors\n// TODO: Use map, filter, and arrow functions",
              expectedOutput:
                "A page that displays users, filters by search term and department, and shows an error message if the data fails to load",
              hintsJson: [
                "Use `await fetch('./data/users.json')` and check `response.ok`",
                "Use `.map()` to generate HTML strings from the user array",
                "Use `.filter()` for both search and department filtering",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is the difference between `const` and `let`?",
              optionsJson: [
                "There is no difference",
                "const can't be reassigned, let can",
                "const is slower",
                "let is block-scoped, const is global",
              ],
              correctAnswer: "const can't be reassigned, let can",
              explanation:
                "`const` creates a read-only reference. `let` creates a variable that can be reassigned. Both are block-scoped.",
              order: 1,
            },
            {
              question: "What does `array.map()` return?",
              optionsJson: [
                "The same array, modified",
                "A new array with transformed elements",
                "A single value",
                "Nothing",
              ],
              correctAnswer: "A new array with transformed elements",
              explanation:
                "`map` applies a function to every element and returns a new array. It does not modify the original array.",
              order: 2,
            },
            {
              question: "Why do we use `event.preventDefault()` on form submit?",
              optionsJson: [
                "To validate the form",
                "To stop the page from reloading",
                "To submit the form faster",
                "To clear the form",
              ],
              correctAnswer: "To stop the page from reloading",
              explanation:
                "By default, form submission causes a full page reload. `event.preventDefault()` stops this so you can handle the submission with JavaScript.",
              order: 3,
            },
            {
              question: "How do you handle errors in async/await?",
              optionsJson: [
                "Using .catch()",
                "Using try/catch",
                "Errors are automatically handled",
                "Using if statements",
              ],
              correctAnswer: "Using try/catch",
              explanation:
                "Wrap async code in a `try` block and handle errors in the `catch` block. This is the standard pattern for async/await error handling.",
              order: 4,
            },
            {
              question: "What does `response.json()` return?",
              optionsJson: [
                "A plain object",
                "A Promise that resolves to parsed JSON",
                "A string",
                "An array",
              ],
              correctAnswer: "A Promise that resolves to parsed JSON",
              explanation:
                "`response.json()` is an async method that reads the response body and parses it as JSON. You must `await` it.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 5: TypeScript ─────────────────────────────────
    {
      title: "TypeScript",
      description:
        "Convert your portfolio to TypeScript: type annotations, interfaces, generics, type narrowing, and Zod runtime validation.",
      slug: "typescript",
      order: 5,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Type Annotations, Interfaces, Type Aliases",
          description:
            "Add static types to your JavaScript with TypeScript 5.9.3. Learn interfaces, type aliases, and function signatures.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Basic Type Annotations",
                body: "TypeScript adds types to JavaScript. Variables, function parameters, and return values can all be typed. The TypeScript compiler catches errors before runtime.",
                code: "// Variables\nconst name: string = \"Alice\";\nconst age: number = 20;\nconst items: string[] = [\"HTML\", \"CSS\", \"JS\"];\n\n// Functions\nconst greet = (name: string): string => {\n  return `Hello, ${name}!`;\n};\n\n// Void — function doesn't return anything\nconst log = (message: string): void => {\n  console.log(message);\n};",
              },
              {
                heading: "Interfaces and Type Aliases",
                body: "Interfaces describe object shapes. Type aliases are more flexible and can represent unions, intersections, and utility types. Use interfaces for objects, type aliases for everything else.",
                code: "interface Project {\n  id: number;\n  title: string;\n  technologies: string[];\n  status: \"not-started\" | \"in-progress\" | \"completed\";\n  url?: string; // Optional\n}\n\n// Type alias\ntype Status = \"not-started\" | \"in-progress\" | \"completed\";\ntype Validator = (value: unknown) => boolean;",
              },
            ],
          },
        },
        {
          title: "Generics and Type Narrowing",
          description:
            "Write flexible, type-safe code with generics. Narrow union types with typeof, instanceof, and discriminated unions.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Generics",
                body: "Generics let you write functions that work with any type while staying type-safe. This is how tRPC and Drizzle work internally.",
                code: "const identity = <T>(value: T): T => value;\n\n// Generic with constraint\nconst getFirst = <T>(array: T[]): T | undefined => array[0];\n\n// Generic interface (how tRPC works!)\ninterface ApiResponse<T> {\n  data: T;\n  success: boolean;\n  error?: string;\n}\n\nconst response: ApiResponse<Project> = {\n  data: portfolio,\n  success: true,\n};",
              },
              {
                heading: "Type Narrowing",
                body: "Type narrowing lets TypeScript understand what type a value is at runtime. Use `typeof`, `instanceof`, or discriminated unions.",
                code: "// typeof narrowing\nconst process = (value: string | number) => {\n  if (typeof value === \"string\") {\n    return value.toUpperCase();\n  }\n  return value * 2;\n};\n\n// Discriminated union\ntype Result<T> =\n  | { success: true; data: T }\n  | { success: false; error: string };\n\nconst handle = <T>(result: Result<T>) => {\n  if (result.success) {\n    console.log(result.data);\n  } else {\n    console.error(result.error);\n  }\n};",
              },
            ],
          },
        },
        {
          title: "Zod Runtime Validation",
          description:
            "Validate data at runtime with Zod 3.25.76. Derive TypeScript types from Zod schemas for a single source of truth.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Zod Basics",
                body: "TypeScript checks types at compile time only. At runtime, all types are erased. Zod validates data at runtime AND generates TypeScript types. This is how Reading Advantage validates tRPC inputs.",
                code: "import { z } from \"zod\";\n\nconst contactSchema = z.object({\n  name: z.string().min(1, \"Name is required\"),\n  email: z.string().email(\"Invalid email\"),\n  message: z.string().min(10, \"Message too short\"),\n});\n\n// Parse — throws on invalid\ncontactSchema.parse({ name: \"Alice\", email: \"a@b.com\", message: \"Hello!\" });\n\n// SafeParse — returns result object\nconst result = contactSchema.safeParse({ name: \"\", email: \"bad\" });\nif (!result.success) {\n  console.error(result.error.issues);\n}",
              },
              {
                heading: "Derive Types from Zod",
                body: "Use `z.infer` to extract a TypeScript type from a Zod schema. This ensures your types and validators never drift out of sync.",
                code: "type ContactForm = z.infer<typeof contactSchema>;\n// Equivalent to: { name: string; email: string; message: string }\n\n// This is how Reading Advantage does it:\n// packages/types defines Zod schemas\n// packages/api imports them for tRPC input validation\n// packages/domain uses the inferred types",
              },
            ],
          },
        },
        {
          title: "Converting JavaScript to TypeScript",
          description:
            "Convert your portfolio from JavaScript to TypeScript step by step. Fix common type errors.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Incremental Conversion Strategy",
                body: "The Reading Advantage approach: rename `.js` to `.ts` one file at a time, fix type errors (start with `any`, then refine), add interfaces for data structures, replace `any` with proper types, and add Zod schemas at API boundaries.",
                code: "# Install TypeScript\npnpm add -D typescript@5.9.3\n\n# Create tsconfig.json\n{\n  \"compilerOptions\": {\n    \"target\": \"ES2022\",\n    \"module\": \"ES2022\",\n    \"strict\": true,\n    \"noImplicitAny\": true,\n    \"strictNullChecks\": true,\n    \"esModuleInterop\": true,\n    \"skipLibCheck\": true\n  }\n}",
              },
              {
                heading: "Fix Common Type Errors",
                body: "Common errors when converting JS to TS: object is possibly null, implicit any, and missing null checks. Fix them with early returns, optional chaining, and explicit types.",
                code: "// Error: Object is possibly null\nconst hero = document.getElementById(\"hero\");\n// hero.querySelector(\"h1\").textContent = \"New\"; // ❌\n\n// Fix: early return\nif (!hero) return;\nhero.querySelector(\"h1\")!.textContent = \"New\";\n\n// Fix: optional chaining\ndocument.getElementById(\"hero\")?.querySelector(\"h1\")?.remove();",
              },
            ],
          },
        },
        {
          title: "TypeScript Exercise + Quiz",
          description:
            "Convert a JavaScript module to TypeScript with Zod validation and test your TypeScript knowledge.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Fork the exercise repo and convert a JavaScript user management module to TypeScript with full type safety and Zod validation.",
          },
          exercises: [
            {
              title: "Convert JS Module to TypeScript",
              instructions:
                "Rename `.js` files to `.ts`, fix all type errors, create a User interface, add Zod schema with type inference, add generics for the API fetch wrapper, and handle null checks with early returns.",
              starterCode:
                "// src/users.js → src/users.ts\n// TODO: Add User interface\n// TODO: Add type annotations to all functions\n// TODO: Create Zod schema and infer type\n// TODO: Use generic apiFetch<T>\n// TODO: Handle null checks",
              expectedOutput:
                "A fully typed TypeScript module with zero type errors under strict mode",
              hintsJson: [
                "Use `interface User { id: number; name: string; email: string; role: 'admin' | 'editor' | 'viewer' }`",
                "Create a Zod schema and derive the type with `z.infer<typeof userSchema>`",
                "Use `<T>` generics for the API fetch wrapper: `apiFetch<T>(url: string): Promise<T>`",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is the difference between an interface and a type alias?",
              optionsJson: [
                "They are identical",
                "interface = object shape, extendable; type = unions, intersections, utilities",
                "type is faster",
                "interface cannot be used for functions",
              ],
              correctAnswer: "interface = object shape, extendable; type = unions, intersections, utilities",
              explanation:
                "Interfaces are for object shapes and can be merged/extended. Type aliases are more flexible and can represent unions, intersections, and utility types.",
              order: 1,
            },
            {
              question: "How do you derive a TypeScript type from a Zod schema?",
              optionsJson: [
                "z.type<typeof schema>",
                "z.infer<typeof schema>",
                "schema.toType()",
                "typeof schema.Type",
              ],
              correctAnswer: "z.infer<typeof schema>",
              explanation:
                "`z.infer<typeof mySchema>` extracts the TypeScript type that corresponds to the Zod schema. This is the standard pattern in the monorepo.",
              order: 2,
            },
            {
              question: "What does `strict: true` enable in tsconfig?",
              optionsJson: [
                "Only strictNullChecks",
                "noImplicitAny, strictNullChecks, and other strict checks",
                "Faster compilation",
                "Automatic type inference",
              ],
              correctAnswer: "noImplicitAny, strictNullChecks, and other strict checks",
              explanation:
                "`strict: true` enables a suite of strict type-checking options including `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, and more.",
              order: 3,
            },
            {
              question: "How do you narrow a union type `string | number`?",
              optionsJson: [
                "Using if (x)",
                "Using typeof check: if (typeof x === 'string')",
                "Using x.toString()",
                "Union types cannot be narrowed",
              ],
              correctAnswer: "Using typeof check: if (typeof x === 'string')",
              explanation:
                "TypeScript understands `typeof` checks and narrows the union type inside the corresponding block.",
              order: 4,
            },
            {
              question: "Why use Zod when TypeScript already has types?",
              optionsJson: [
                "Zod is faster",
                "TypeScript checks compile-time only; Zod validates at runtime",
                "TypeScript does not support objects",
                "Zod replaces TypeScript",
              ],
              correctAnswer: "TypeScript checks compile-time only; Zod validates at runtime",
              explanation:
                "TypeScript types are erased at runtime. Data from APIs, forms, and files could be anything. Zod validates data at runtime AND generates TypeScript types from the same schema.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 6: Testing with Vitest ────────────────────────
    {
      title: "Testing with Vitest",
      description:
        "Write unit tests for your portfolio utilities with Vitest 4.1.5: AAA pattern, mocking, async testing, and TDD.",
      slug: "vitest",
      order: 6,
      phase: "A",
      status: "published",
      lessons: [
        {
          title: "Writing Unit Tests",
          description:
            "Learn the Arrange-Act-Assert pattern and Vitest matchers. Write your first unit tests.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Set Up Vitest",
                body: "Vitest 4.1.5 is the test framework used in the Reading Advantage monorepo. It has a Jest-compatible API and works with Vite.",
                code: "pnpm add -D vitest@4.1.5\n\n// package.json\n{\n  \"scripts\": {\n    \"test\": \"vitest run\",\n    \"test:watch\": \"vitest\"\n  }\n}\n\n// vitest.config.ts\nimport { defineConfig } from \"vitest/config\";\nexport default defineConfig({\n  test: { globals: true },\n});",
              },
              {
                heading: "AAA Pattern",
                body: "Every test follows Arrange-Act-Assert: set up the data, perform the action, verify the result. This makes tests readable and maintainable.",
                code: "import { describe, it, expect } from \"vitest\";\nimport { truncate } from \"../utils.js\";\n\ndescribe(\"truncate\", () => {\n  it(\"returns original text when shorter than maxLength\", () => {\n    // Arrange\n    const text = \"Hello\";\n    const maxLength = 10;\n    // Act\n    const result = truncate(text, maxLength);\n    // Assert\n    expect(result).toBe(\"Hello\");\n  });\n});",
              },
              {
                heading: "Common Matchers",
                body: "Vitest provides matchers for every assertion need: `toBe` for primitives, `toEqual` for objects, `toHaveLength` for arrays, `toThrow` for errors, and `toHaveBeenCalled` for mocks.",
                code: "expect(result).toBe(\"Hello\");\nexpect(result).toEqual({ id: 1, name: \"Alice\" });\nexpect(array).toHaveLength(3);\nexpect(fn).toHaveBeenCalledTimes(2);\nexpect(fn).toHaveBeenCalledWith(\"hello\");",
              },
            ],
          },
        },
        {
          title: "Mocking",
          description:
            "Control dependencies in tests with `vi.fn()` for mock functions and `vi.mock()` for mock modules.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "vi.fn() — Mock Functions",
                body: "Mock functions let you assert how they were called, what arguments they received, and what they returned. This is essential for testing callbacks and handlers.",
                code: "import { vi } from \"vitest\";\n\nconst onClick = vi.fn();\nonClick(\"hello\");\nonClick(\"world\");\n\nexpect(onClick).toHaveBeenCalled();\nexpect(onClick).toHaveBeenCalledTimes(2);\nexpect(onClick).toHaveBeenCalledWith(\"hello\");",
              },
              {
                heading: "vi.mock() — Mock Modules",
                body: "Mock external modules like the Fetch API or database clients. This makes tests deterministic, fast, and independent of network state.",
                code: "const mockFetch = vi.fn();\nglobalThis.fetch = mockFetch;\n\nmockFetch.mockResolvedValueOnce({\n  ok: true,\n  json: () => Promise.resolve([{ id: 1, title: \"Test\" }]),\n});\n\nconst result = await loadProjects();\nexpect(result).toEqual([{ id: 1, title: \"Test\" }]);",
              },
            ],
          },
        },
        {
          title: "Async Testing and TDD",
          description:
            "Test async functions and practice the Test-Driven Development cycle: Red, Green, Refactor.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Testing Async Functions",
                body: "Use `await` with expect, or the `resolves` and `rejects` matchers for async assertions. Always test success, failure, and edge cases.",
                code: "// Success\nawait expect(loadProject(1)).resolves.toEqual(mockData);\n\n// Failure\nawait expect(loadProject(999)).rejects.toThrow(\"HTTP 404\");\n\n// Network error\nmockFetch.mockRejectedValueOnce(new Error(\"Network error\"));\nawait expect(loadProject(1)).rejects.toThrow(\"Network error\");",
              },
              {
                heading: "TDD — Red, Green, Refactor",
                body: "TDD means writing the test first, then the minimum code to pass, then cleaning up. This produces better designs and acts as documentation.",
                code: "// Step 1: RED — write a failing test\nexpect(validateEmail(\"user@example.com\")).toEqual({ valid: true });\nexpect(validateEmail(\"bad\")).toEqual({ valid: false, error: \"Missing @\" });\n\n// Step 2: GREEN — write minimum code\nexport const validateEmail = (email: string) => {\n  if (!email.includes(\"@\")) return { valid: false, error: \"Missing @\" };\n  return { valid: true };\n};\n\n// Step 3: REFACTOR — clean up while tests pass",
              },
            ],
          },
        },
        {
          title: "Testing with Vitest Exercise + Quiz",
          description:
            "Write tests using TDD for string utility functions and test your testing knowledge.",
          order: 4,
          type: "quiz",
          contentJson: {
            instructions:
              "Fork the exercise repo and build string utility functions using TDD: write the test first, then the implementation, then refactor.",
          },
          exercises: [
            {
              title: "TDD String Utilities",
              instructions:
                "Build capitalize, camelCase, pluralize, and parseQueryString functions using TDD. Write tests first, achieve >80% coverage, and use vi.fn() where appropriate.",
              starterCode:
                "// src/__tests__/string-utils.test.ts\n// TODO: Write failing tests for capitalize\n// TODO: Write failing tests for camelCase\n// TODO: Write failing tests for pluralize\n// TODO: Write failing tests for parseQueryString\n\n// src/string-utils.ts\n// TODO: Implement functions to make tests pass",
              expectedOutput:
                "All tests passing with >80% coverage",
              hintsJson: [
                "Use the AAA pattern: Arrange, Act, Assert",
                "Test edge cases: empty strings, single characters, unusual inputs",
                "Run `pnpm vitest run --coverage` to check coverage",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is the AAA pattern?",
              optionsJson: [
                "Always Add Assertions",
                "Arrange, Act, Assert — structure for test clarity",
                "Async, Await, Assert",
                "Automatic Assertion API",
              ],
              correctAnswer: "Arrange, Act, Assert — structure for test clarity",
              explanation:
                "AAA stands for Arrange (set up data), Act (perform the operation), Assert (verify the result). It is the standard structure for unit tests.",
              order: 1,
            },
            {
              question: "What does `vi.fn()` create?",
              optionsJson: [
                "A real function",
                "A mock function you can assert against",
                "A test suite",
                "A module import",
              ],
              correctAnswer: "A mock function you can assert against",
              explanation:
                "`vi.fn()` creates a mock function that records how it was called, what arguments it received, and what it returned. You can assert against these records.",
              order: 2,
            },
            {
              question: "What are the three steps of TDD?",
              optionsJson: [
                "Write, Run, Debug",
                "Red → Green → Refactor",
                "Plan → Code → Test",
                "Setup → Test → Deploy",
              ],
              correctAnswer: "Red → Green → Refactor",
              explanation:
                "TDD cycle: 1) RED — write a failing test, 2) GREEN — write minimum code to pass, 3) REFACTOR — clean up while keeping tests green.",
              order: 3,
            },
            {
              question: "What does `--coverage` measure?",
              optionsJson: [
                "Test execution speed",
                "Percentage of code exercised by tests",
                "Number of test files",
                "Code quality score",
              ],
              correctAnswer: "Percentage of code exercised by tests",
              explanation:
                "Coverage measures what percentage of statements, branches, functions, and lines are executed during tests. Reading Advantage targets >80% coverage for new code.",
              order: 4,
            },
            {
              question: "Why mock fetch in tests instead of calling the real API?",
              optionsJson: [
                "It is required by law",
                "Deterministic, fast, no network dependency",
                "Real APIs are always down",
                "Mocks are easier to write",
              ],
              correctAnswer: "Deterministic, fast, no network dependency",
              explanation:
                "Mocking external APIs makes tests deterministic (same result every time), fast (no network latency), and independent of external services.",
              order: 5,
            },
          ],
        },
      ],
    },
  ];

  return { modules, exerciseRepos: getExerciseRepos(modules) };
}

function getExerciseRepos(modules: CurriculumModule[]): CurriculumRepo[] {
  return modules.map((mod) => ({
    moduleSlug: mod.slug,
    repoUrl: `https://github.com/reading-advantage/codecamp-${mod.slug}`,
    description: `Exercise repository for ${mod.title}`,
    order: mod.order,
  }));
}
