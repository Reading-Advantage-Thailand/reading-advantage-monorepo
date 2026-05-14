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
                "Neither downloads anything",
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

export function getPhaseCCurriculumData() {
  const modules: CurriculumModule[] = [
    // ─── Module 11: Databases & ORMs ──────────────────────────
    {
      title: "Databases & ORMs",
      description:
        "Add a PostgreSQL database to the Student Progress Tracker with Drizzle ORM 0.44.7: schema definition, queries, migrations, and multi-tenant patterns.",
      slug: "databases-orms",
      order: 11,
      phase: "C",
      status: "published",
      lessons: [
        {
          title: "PostgreSQL Basics and SQL",
          description:
            "Learn relational database concepts and write basic SQL: CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, and JOIN.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Relational Database Concepts",
                body: "Databases store your application's data permanently. PostgreSQL 16 is the database used by Reading Advantage. A relational database organizes data into tables with rows and columns. Tables relate to each other through foreign keys.",
                code: "| Concept | What it is | SQL equivalent |\n|---------|-----------|---------------|\n| Table | A collection of related data | CREATE TABLE |\n| Row | A single record | INSERT INTO |\n| Column | A field in the record | Defined in CREATE TABLE |\n| Primary Key | Unique identifier for a row | id SERIAL PRIMARY KEY |\n| Foreign Key | Reference to another table's row | REFERENCES other_table(id) |\n| Index | Speeds up lookups | CREATE INDEX |",
              },
              {
                heading: "Start PostgreSQL with Docker",
                body: "Reading Advantage uses Docker to run PostgreSQL locally. The same command works on every developer's machine.",
                code: "# Start Postgres (same as Reading Advantage's pnpm db:start)\ndocker run -d \\\n  --name tracker-db \\\n  -e POSTGRES_PASSWORD=postgres \\\n  -e POSTGRES_DB=tracker \\\n  -p 5432:5432 \\\n  postgres:16-alpine\n\n# Connect to it\ndocker exec -it tracker-db psql -U postgres -d tracker",
              },
              {
                heading: "Basic SQL",
                body: "SQL is the language for interacting with relational databases. These are the four basic operations you'll use every day.",
                code: "-- Create a table\nCREATE TABLE students (\n  id SERIAL PRIMARY KEY,\n  name TEXT NOT NULL,\n  email TEXT NOT NULL UNIQUE,\n  school_id TEXT NOT NULL,\n  role TEXT NOT NULL DEFAULT 'student'\n);\n\n-- Insert data\nINSERT INTO students (name, email, school_id, role)\nVALUES ('Alice', 'alice@school.com', 'school-1', 'student');\n\n-- Query data\nSELECT * FROM students;\nSELECT name, email FROM students WHERE school_id = 'school-1';\nSELECT * FROM students WHERE role = 'student' ORDER BY name;\n\n-- Update data\nUPDATE students SET role = 'teacher' WHERE email = 'alice@school.com';\n\n-- Delete data\nDELETE FROM students WHERE id = 2;\n\n-- Join tables\nSELECT s.name, p.score, l.title\nFROM progress p\nJOIN students s ON p.student_id = s.id\nJOIN lessons l ON p.lesson_id = l.id\nWHERE s.school_id = 'school-1';",
              },
            ],
          },
        },
        {
          title: "Drizzle Schema Definition",
          description:
            "Define database schemas in TypeScript with Drizzle ORM 0.44.7: pgTable, columns, enums, and relations.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Install and Configure Drizzle",
                body: "Drizzle ORM lets you define schemas in TypeScript and get auto-completed queries. Same tool used in packages/db/src/schema/ in the Reading Advantage monorepo.",
                code: "pnpm add drizzle-orm@0.44.7\npnpm add -D drizzle-kit@0.31.10\n\n// drizzle.config.ts\nimport { defineConfig } from \"drizzle-kit\";\n\nexport default defineConfig({\n  schema: \"./src/db/schema.ts\",\n  out: \"./drizzle\",\n  dialect: \"postgresql\",\n  dbCredentials: {\n    url: process.env.DATABASE_URL ?? \"postgres://postgres:postgres@localhost:5432/tracker\",\n  },\n});",
              },
              {
                heading: "Define Tables with pgTable",
                body: "Drizzle's pgTable lets you define tables with type-safe columns. Every column has a type, constraints, and defaults.",
                code: "import { pgTable, uuid, text, integer, timestamp, pgEnum } from \"drizzle-orm/pg-core\";\n\nexport const roleEnum = pgEnum(\"role\", [\"student\", \"teacher\", \"admin\"]);\nexport const lessonTypeEnum = pgEnum(\"lesson_type\", [\"theory\", \"exercise\", \"quiz\"]);\n\nexport const students = pgTable(\"students\", {\n  id: uuid(\"id\").defaultRandom().primaryKey(),\n  name: text(\"name\").notNull(),\n  email: text(\"email\").notNull().unique(),\n  schoolId: text(\"school_id\").notNull(),\n  role: roleEnum(\"role\").notNull().default(\"student\"),\n  createdAt: timestamp(\"created_at\").defaultNow().notNull(),\n});\n\nexport const modules = pgTable(\"modules\", {\n  id: uuid(\"id\").defaultRandom().primaryKey(),\n  title: text(\"title\").notNull(),\n  slug: text(\"slug\").notNull().unique(),\n  order: integer(\"order\").notNull(),\n  schoolId: text(\"school_id\").notNull(),\n  status: text(\"status\").notNull().default(\"draft\"),\n  createdAt: timestamp(\"created_at\").defaultNow().notNull(),\n});",
              },
              {
                heading: "Define Relations",
                body: "Drizzle relations define how tables connect. This gives you type-safe joins and nested queries.",
                code: "import { relations } from \"drizzle-orm\";\n\nexport const modulesRelations = relations(modules, ({ many }) => ({\n  lessons: many(lessons),\n}));\n\nexport const lessonsRelations = relations(lessons, ({ one, many }) => ({\n  module: one(modules, {\n    fields: [lessons.moduleId],\n    references: [modules.id],\n  }),\n  progress: many(progress),\n}));",
              },
            ],
          },
        },
        {
          title: "Drizzle Queries",
          description:
            "Write fully type-safe SELECT, INSERT, UPDATE, and DELETE queries with Drizzle.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "SELECT Queries",
                body: "Drizzle queries are fully type-safe: auto-completed column names, inferred return types. Always scope by schoolId for multi-tenancy.",
                code: "import { eq, and, desc, sql } from \"drizzle-orm\";\n\n// Get all modules for a school (multi-tenant!)\nconst schoolModules = await db\n  .select()\n  .from(modules)\n  .where(eq(modules.schoolId, \"school-1\"))\n  .orderBy(modules.order);\n\n// Get a specific module by slug\nconst [module] = await db\n  .select()\n  .from(modules)\n  .where(and(eq(modules.slug, \"react\"), eq(modules.schoolId, \"school-1\")));\n\n// Select specific columns\nconst moduleTitles = await db\n  .select({ id: modules.id, title: modules.title })\n  .from(modules)\n  .where(eq(modules.schoolId, \"school-1\"));\n\n// Count\nconst [{ count }] = await db\n  .select({ count: sql<number>`count(*)` })\n  .from(progress)\n  .where(eq(progress.status, \"completed\"));",
              },
              {
                heading: "INSERT and UPDATE",
                body: "Insert new rows and update existing ones with .returning() to get the modified data back.",
                code: "// Insert one row\nconst [newStudent] = await db\n  .insert(students)\n  .values({\n    name: \"Alice\",\n    email: \"alice@school.com\",\n    schoolId: \"school-1\",\n    role: \"student\",\n  })\n  .returning();\n\n// Update progress\nconst [updated] = await db\n  .update(progress)\n  .set({\n    status: \"completed\",\n    score: 95,\n    completedAt: new Date(),\n  })\n  .where(and(\n    eq(progress.studentId, studentId),\n    eq(progress.lessonId, lessonId),\n    eq(progress.schoolId, \"school-1\")\n  ))\n  .returning();",
              },
            ],
          },
        },
        {
          title: "Migrations and Multi-Tenancy",
          description:
            "Generate migrations with drizzle-kit and understand Reading Advantage's TenantDB multi-tenant pattern.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Migration Workflow",
                body: "Migrations track schema changes over time — like Git for your database. The workflow is: edit schema, generate migration, apply migration, commit both.",
                code: "# Generate a migration from schema changes\npnpm drizzle-kit generate\n\n# Apply pending migrations\npnpm drizzle-kit migrate\n\n# View current state\npnpm drizzle-kit studio  # Opens a visual DB browser",
              },
              {
                heading: "Multi-Tenancy Pattern",
                body: "The core pattern from Reading Advantage: every query MUST include schoolId. TenantDB enforces this automatically.",
                code: "// ❌ WRONG — no schoolId filter\nconst allModules = await db.select().from(modules);\n\n// ✅ CORRECT — scoped to the tenant's school\nconst schoolModules = await db\n  .select()\n  .from(modules)\n  .where(eq(modules.schoolId, \"school-1\"));\n\n// The rule: Every query MUST include schoolId.\n// TenantDB injects it automatically in Reading Advantage.",
              },
              {
                heading: "Seed Data",
                body: "Seed scripts populate the database with initial data for development and testing.",
                code: "async function seed() {\n  const [school1] = await db.insert(schools).values({\n    id: \"school-1\",\n    name: \"Reading Advantage Academy\",\n  }).returning();\n\n  await db.insert(modules).values([\n    { title: \"Dev Environment\", slug: \"dev-env\", order: 1, schoolId: school1.id },\n    { title: \"Git & GitHub\", slug: \"git-github\", order: 2, schoolId: school1.id },\n  ]);\n}",
              },
            ],
          },
        },
        {
          title: "Databases & ORMs Exercise + Quiz",
          description:
            "Design a blog database with Drizzle and test your database knowledge.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the database exercise by designing a schema and writing queries for a blog application.",
          },
          exercises: [
            {
              title: "Design a Blog Database",
              instructions:
                "Fork the exercise repo and design a blog database with Drizzle: define users, posts, comments, tags, and post_tags tables; define relations; generate and apply the migration; write multi-tenant query functions; write a seed script.",
              starterCode:
                "// TODO: Define tables with Drizzle\n// TODO: Define relations\n// TODO: Generate migration\n// TODO: Write query functions\n// TODO: Write seed script",
              expectedOutput:
                "A working blog database with schema, migrations, queries, and seed data",
              hintsJson: [
                "Use pgEnum for status and role columns",
                "Add .references() with onDelete: 'cascade' for foreign keys",
                "Every query function must accept and use schoolId",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is a foreign key?",
              optionsJson: [
                "A key that unlocks the database",
                "A column that references the primary key of another table",
                "A password for the database",
                "An index that speeds up queries",
              ],
              correctAnswer: "A column that references the primary key of another table",
              explanation:
                "A foreign key creates a relationship between two tables by referencing the primary key of another table.",
              order: 1,
            },
            {
              question: "What does `drizzle-kit generate` do?",
              optionsJson: [
                "Runs the database",
                "Compares schema to database and creates a SQL migration file",
                "Installs dependencies",
                "Deletes old data",
              ],
              correctAnswer:
                "Compares schema to database and creates a SQL migration file",
              explanation:
                "drizzle-kit generate compares your TypeScript schema to the current database state and generates a SQL migration file.",
              order: 2,
            },
            {
              question: "Why must every query include `schoolId`?",
              optionsJson: [
                "It is required by PostgreSQL",
                "To enforce multi-tenancy — each school can only see its own data",
                "It makes queries faster",
                "It is a Drizzle requirement",
              ],
              correctAnswer:
                "To enforce multi-tenancy — each school can only see its own data",
              explanation:
                "Multi-tenancy means multiple schools share one database but can only access their own data. schoolId scopes every query.",
              order: 3,
            },
            {
              question: "What does `.returning()` do on an INSERT?",
              optionsJson: [
                "Nothing",
                "Returns the inserted row including auto-generated fields like id",
                "Rolls back the insert",
                "Validates the data",
              ],
              correctAnswer:
                "Returns the inserted row including auto-generated fields like id",
              explanation:
                ".returning() tells Drizzle to return the inserted row, including auto-generated fields like the UUID primary key.",
              order: 4,
            },
            {
              question: "What is the difference between `onDelete: 'cascade'` and the default?",
              optionsJson: [
                "There is no difference",
                "cascade automatically deletes related rows; default prevents deletion if referenced rows exist",
                "cascade is slower",
                "default deletes everything",
              ],
              correctAnswer:
                "cascade automatically deletes related rows; default prevents deletion if referenced rows exist",
              explanation:
                "With cascade, deleting a parent row automatically deletes child rows that reference it. The default behavior prevents deleting a parent if children exist.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 12: tRPC & Server Actions ─────────────────────
    {
      title: "tRPC & Server Actions",
      description:
        "Build the API layer for the Student Progress Tracker with tRPC 11.17.0: thin routers, thick domain functions, and Server Actions.",
      slug: "trpc-server-actions",
      order: 12,
      phase: "C",
      status: "published",
      lessons: [
        {
          title: "Thin Router / Thick Domain Architecture",
          description:
            "Understand the most important architectural pattern in Reading Advantage: routers validate, domain functions hold logic.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "The Architecture",
                body: "The most important architectural pattern in Reading Advantage. Routers validate input and delegate — domain functions hold the logic. This separation makes code testable, maintainable, and secure.",
                code: "┌──────────────────┐     ┌───────────────────┐     ┌──────────────┐     ┌──────────┐\n│  tRPC Router     │     │  Domain Function  │     │   Drizzle    │     │ Postgres │\n│  (thin wrapper)  │────▶│  (business logic) │────▶│   (query)    │────▶│  (data)  │\n│                  │     │                   │     │              │     │          │\n│ • Validate input │     │ • assertCan()     │     │ • select()   │     │          │\n│ • Call domain fn │     │ • Business rules  │     │ • insert()   │     │          │\n│ • Return result  │     │ • Data transforms │     │ • update()   │     │          │\n└──────────────────┘     └───────────────────┘     └──────────────┘     └──────────┘",
              },
              {
                heading: "Domain Function Pattern",
                body: "Every domain function follows the same pattern: permission check first, then business logic, then return the result.",
                code: "export async function getModules({ db, user, tenant }: {\n  db: DB; user: User; tenant: Tenant;\n}) {\n  // 1. Permission check FIRST\n  assertCan(user, \"module:read\", tenant);\n\n  // 2. Business logic\n  const result = await db\n    .select()\n    .from(modules)\n    .where(eq(modules.schoolId, tenant.schoolId))\n    .orderBy(modules.order);\n\n  // 3. Return the result\n  return result;\n}",
              },
              {
                heading: "assertCan Implementation",
                body: "assertCan checks if a user's role has permission to perform an action. It is called first in every domain function before any mutation.",
                code: "type Permission =\n  | \"module:read\"\n  | \"module:create\"\n  | \"progress:read\"\n  | \"progress:update\"\n  | \"quiz:submit\";\n\nconst ROLE_PERMISSIONS: Record<string, Permission[]> = {\n  student: [\"module:read\", \"progress:read\", \"progress:update\", \"quiz:submit\"],\n  teacher: [\"module:read\", \"module:create\", \"progress:read\", \"progress:update\", \"quiz:submit\"],\n  admin: [\"module:read\", \"module:create\", \"progress:read\", \"progress:update\", \"quiz:submit\"],\n};\n\nexport function assertCan(user: User, permission: Permission, tenant: Tenant) {\n  const allowed = ROLE_PERMISSIONS[user.role] ?? [];\n  if (!allowed.includes(permission)) {\n    throw new AuthError(`User role '${user.role}' cannot '${permission}'`);\n  }\n}",
              },
            ],
          },
        },
        {
          title: "tRPC Router Setup",
          description:
            "Set up tRPC 11.17.0 with type-safe routers, input validation with Zod, and protected procedures.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Install and Configure tRPC",
                body: "tRPC gives you end-to-end type safety — the frontend automatically knows the API types. No more writing fetch calls and manually typing responses.",
                code: "pnpm add @trpc/server@11.17.0 @trpc/client@11.17.0 @trpc/react-query@11.17.0 @tanstack/react-query@5.90.10\n\n// src/server/trpc.ts\nimport { initTRPC } from \"@trpc/server\";\n\nexport interface Context {\n  db: DB;\n  user: User | null;\n  tenant: Tenant;\n}\n\nconst t = initTRPC.context<Context>().create();\n\nexport const router = t.router;\nexport const publicProcedure = t.procedure;\nexport const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {\n  if (!ctx.user) throw new AuthError(\"Authentication required\");\n  return next({ ctx: { ...ctx, user: ctx.user } });\n});",
              },
              {
                heading: "Write a tRPC Router",
                body: "The router is thin — validate input with Zod 3.25.76, call domain, return result. Zero business logic in the router.",
                code: "import { z } from \"zod\";\nimport { router, protectedProcedure } from \"../trpc.js\";\nimport { getModules, createModule } from \"../../domain/modules/index.js\";\n\nexport const modulesRouter = router({\n  list: protectedProcedure\n    .query(({ ctx }) => getModules({\n      db: ctx.db, user: ctx.user, tenant: ctx.tenant,\n    })),\n\n  create: protectedProcedure\n    .input(z.object({\n      title: z.string().min(1),\n      slug: z.string().min(1),\n      description: z.string(),\n      order: z.number().int().positive(),\n    }))\n    .mutation(({ ctx, input }) => createModule({\n      db: ctx.db, user: ctx.user, tenant: ctx.tenant, input,\n    })),\n});",
              },
              {
                heading: "Merge Routers",
                body: "Combine all routers into a single appRouter. Export the type for frontend type inference.",
                code: "import { router } from \"./trpc.js\";\nimport { modulesRouter } from \"./routers/modules.js\";\nimport { progressRouter } from \"./routers/progress.js\";\n\nexport const appRouter = router({\n  modules: modulesRouter,\n  progress: progressRouter,\n});\n\nexport type AppRouter = typeof appRouter;",
              },
            ],
          },
        },
        {
          title: "tRPC on the Frontend",
          description:
            "Consume tRPC procedures from React with fully typed hooks: useQuery, useMutation, and cache invalidation.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Set Up tRPC Client",
                body: "The frontend client connects to the tRPC API and provides fully typed hooks.",
                code: "// src/lib/trpc-react.ts\nimport { createTRPCReact } from \"@trpc/react-query\";\nimport type { AppRouter } from \"@/server/root\";\n\nexport const trpc = createTRPCReact<AppRouter>();\n\n// src/app/providers.tsx\n\"use client\";\nimport { QueryClient, QueryClientProvider } from \"@tanstack/react-query\";\nimport { httpBatchLink } from \"@trpc/client\";\nimport { trpc } from \"@/lib/trpc-react\";\nimport { useState } from \"react\";\n\nexport function Providers({ children }: { children: React.ReactNode }) {\n  const [queryClient] = useState(() => new QueryClient());\n  const [trpcClient] = useState(() =>\n    trpc.createClient({ links: [httpBatchLink({ url: \"/api/trpc\" })] })\n  );\n  return (\n    <trpc.Provider client={trpcClient} queryClient={queryClient}>\n      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>\n    </trpc.Provider>\n  );\n}",
              },
              {
                heading: "Using tRPC Queries and Mutations",
                body: "Frontend hooks are auto-typed — no manual API client needed. useQuery for reads, useMutation for writes.",
                code: "\"use client\";\nimport { trpc } from \"@/lib/trpc-react\";\n\nexport function ModuleList() {\n  const utils = trpc.useUtils();\n  const { data: modules, isLoading } = trpc.modules.list.useQuery();\n  const createModule = trpc.modules.create.useMutation({\n    onSuccess: () => { utils.modules.list.invalidate(); },\n  });\n\n  if (isLoading) return <div>Loading...</div>;\n  return (\n    <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n      {modules?.map((mod) => <ModuleCard key={mod.id} module={mod} />)}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Server Actions",
          description:
            "Use Next.js Server Actions for simple form submissions without building an API route.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Define a Server Action",
                body: "Server Actions are Next.js's way to call server code directly from a form. Simpler than tRPC for simple mutations.",
                code: "// src/app/actions/progress.ts\n\"use server\";\n\nimport { assertCan } from \"@/auth/permissions\";\nimport { db } from \"@/db\";\nimport { progress } from \"@/db/schema\";\nimport { eq, and } from \"drizzle-orm\";\nimport { z } from \"zod\";\n\nconst updateProgressSchema = z.object({\n  lessonId: z.string().uuid(),\n  status: z.enum([\"not_started\", \"in_progress\", \"completed\"]),\n  score: z.number().int().min(0).max(100).optional(),\n});\n\nexport async function updateProgress(formData: FormData) {\n  const user = await getCurrentUser();\n  const input = updateProgressSchema.parse({\n    lessonId: formData.get(\"lessonId\"),\n    status: formData.get(\"status\"),\n    score: formData.get(\"score\") ? Number(formData.get(\"score\")) : undefined,\n  });\n  await db.update(progress).set({ status: input.status, score: input.score })\n    .where(and(eq(progress.studentId, user.id), eq(progress.lessonId, input.lessonId)));\n  revalidatePath(\"/modules\");\n}",
              },
              {
                heading: "tRPC vs Server Actions",
                body: "Reading Advantage uses tRPC for almost everything. Server Actions are useful for specific form flows.",
                code: "| Use tRPC when | Use Server Actions when |\n|---------------|----------------------|\n| Complex queries with caching | Simple form submissions |\n| Multiple consumers | Only one Next.js app uses it |\n| Need React Query caching | Progressive enhancement |\n| Complex input validation | Quick mutations without cache mgmt |",
              },
            ],
          },
        },
        {
          title: "tRPC & Server Actions Exercise + Quiz",
          description:
            "Build a Blog API with tRPC and test your API knowledge.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the tRPC exercise by building routers and domain functions for a blog API.",
          },
          exercises: [
            {
              title: "Build a Blog API with tRPC",
              instructions:
                "Fork the exercise repo and build a blog API: create domain functions with assertCan, create tRPC routers with Zod validation, merge routers into appRouter, set up the API route handler, create a frontend component using useQuery and useMutation.",
              starterCode:
                "// TODO: Create domain functions in src/domain/\n// TODO: Create tRPC routers in src/server/routers/\n// TODO: Merge routers and export type\n// TODO: Set up API route handler\n// TODO: Create frontend component",
              expectedOutput:
                "A fully typed blog API with tRPC routers, domain functions, and a React frontend",
              hintsJson: [
                "Call assertCan() in every domain function before any mutation",
                "Use Zod schemas for input validation on all procedures",
                "The router should be thin — zero business logic",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "Where should business logic live?",
              optionsJson: [
                "In the tRPC router",
                "In domain functions",
                "In the database",
                "In the frontend",
              ],
              correctAnswer: "In domain functions",
              explanation:
                "Business logic lives in domain functions. Routers are thin wrappers that validate input and delegate.",
              order: 1,
            },
            {
              question: "What does `assertCan()` do and where is it called?",
              optionsJson: [
                "Checks permissions, called first in every domain function",
                "Validates input, called in the router",
                "Hashes passwords, called in auth",
                "Creates sessions, called in middleware",
              ],
              correctAnswer: "Checks permissions, called first in every domain function",
              explanation:
                "assertCan() checks if the user's role has the required permission. It is called first in every domain function before any mutation.",
              order: 2,
            },
            {
              question: "What makes tRPC 'type-safe'?",
              optionsJson: [
                "It uses TypeScript",
                "The frontend automatically infers types from the router definition",
                "It validates at runtime",
                "It uses Zod",
              ],
              correctAnswer: "The frontend automatically infers types from the router definition",
              explanation:
                "tRPC uses the AppRouter type to infer all input and output types on the frontend. No manual typing needed.",
              order: 3,
            },
            {
              question: "When should you use Server Actions instead of tRPC?",
              optionsJson: [
                "Always",
                "Simple form submissions, progressive enhancement, single-consumer mutations",
                "Never",
                "Only for API routes",
              ],
              correctAnswer: "Simple form submissions, progressive enhancement, single-consumer mutations",
              explanation:
                "Server Actions are simpler than tRPC for basic form submissions that don't need complex caching or multiple consumers.",
              order: 4,
            },
            {
              question: "What is the domain function signature?",
              optionsJson: [
                "(input) => result",
                "({ db, user, tenant, input }) => result",
                "(req, res) => void",
                "(props) => JSX",
              ],
              correctAnswer: "({ db, user, tenant, input }) => result",
              explanation:
                "Every domain function receives an object with db, user, tenant, and optional input. This is the standard pattern in Reading Advantage.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 13: Authentication ────────────────────────────
    {
      title: "Authentication",
      description:
        "Add login, logout, sessions, and role-based access control to the Student Progress Tracker.",
      slug: "authentication",
      order: 13,
      phase: "C",
      status: "published",
      lessons: [
        {
          title: "Session-Based Authentication",
          description:
            "Implement cookie-based session authentication with password hashing and secure session cookies.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Sessions and Password Hashing",
                body: "Authentication proves who you are. Authorization decides what you can do. Sessions track logged-in users with secure cookies.",
                code: "// Schema additions\nexport const sessions = pgTable(\"sessions\", {\n  id: uuid(\"id\").defaultRandom().primaryKey(),\n  userId: uuid(\"user_id\").notNull().references(() => students.id),\n  token: text(\"token\").notNull().unique(),\n  expiresAt: timestamp(\"expires_at\").notNull(),\n  createdAt: timestamp(\"created_at\").defaultNow().notNull(),\n});\n\n// Password hashing\nimport bcrypt from \"bcrypt\";\nexport async function hashPassword(password: string) {\n  return bcrypt.hash(password, 10);\n}\nexport async function verifyPassword(password: string, hash: string) {\n  return bcrypt.compare(password, hash);\n}",
              },
              {
                heading: "Login Flow",
                body: "The login flow: validate credentials, create a session, set a secure cookie.",
                code: "export async function createSession(db: DB, userId: string): Promise<string> {\n  const token = randomUUID();\n  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);\n  await db.insert(sessions).values({ userId, token, expiresAt });\n  return token;\n}\n\n// Login route\nconst token = await createSession(db, user.id);\nconst response = NextResponse.json({ success: true });\nresponse.cookies.set(\"session\", token, {\n  httpOnly: true,\n  secure: process.env.NODE_ENV === \"production\",\n  sameSite: \"lax\",\n  maxAge: 30 * 24 * 60 * 60,\n  path: \"/\",\n});\nreturn response;",
              },
            ],
          },
        },
        {
          title: "Logout, Middleware, and Auth Context",
          description:
            "Complete the auth flow with logout, route protection middleware, and tRPC auth context.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Logout Route",
                body: "Logout deletes the session and clears the cookie.",
                code: "export async function POST(request: Request) {\n  const token = request.cookies.get(\"session\")?.value;\n  if (token) await deleteSession(db, token);\n  const response = NextResponse.json({ success: true });\n  response.cookies.set(\"session\", \"\", {\n    httpOnly: true, secure: true, sameSite: \"lax\",\n    maxAge: 0, path: \"/\",\n  });\n  return response;\n}",
              },
              {
                heading: "Auth Middleware",
                body: "Middleware protects routes by checking for valid session cookies before requests reach pages.",
                code: "// src/middleware.ts\nexport function middleware(request: NextRequest) {\n  const sessionToken = request.cookies.get(\"session\")?.value;\n  const protectedPaths = [\"/modules\", \"/progress\", \"/chat\"];\n  const isProtected = protectedPaths.some((p) =>\n    request.nextUrl.pathname.startsWith(p)\n  );\n  if (isProtected && !sessionToken) {\n    const loginUrl = new URL(\"/login\", request.url);\n    loginUrl.searchParams.set(\"from\", request.nextUrl.pathname);\n    return NextResponse.redirect(loginUrl);\n  }\n  return NextResponse.next();\n}",
              },
              {
                heading: "tRPC Context with Auth",
                body: "The tRPC context resolves the user from the session cookie. protectedProcedure guarantees a non-null user.",
                code: "export async function createContext(request: Request): Promise<Context> {\n  const sessionToken = request.cookies.get(\"session\")?.value;\n  const user = sessionToken ? await getSession(db, sessionToken) : null;\n  const tenant = user ? { schoolId: user.schoolId } : { schoolId: \"\" };\n  return { db, user, tenant };\n}\n\nexport const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {\n  if (!ctx.user) {\n    throw new TRPCError({ code: \"UNAUTHORIZED\" });\n  }\n  return next({ ctx: { ...ctx, user: ctx.user } });\n});",
              },
            ],
          },
        },
        {
          title: "Role-Based Access Control (RBAC)",
          description:
            "Implement RBAC with assertCan: different roles have different permissions, and users can only access their own school's data.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Define Roles and Permissions",
                body: "RBAC assigns permissions to roles, not individual users. The assertCan function checks both permission and tenant.",
                code: "const PERMISSIONS = {\n  student: [\"module:read\", \"lesson:read\", \"progress:read\", \"progress:update\", \"quiz:submit\", \"chat:use\"],\n  teacher: [\"module:read\", \"lesson:read\", \"progress:read\", \"progress:update\", \"quiz:submit\", \"chat:use\", \"student:read\", \"student:list\"],\n  admin: [\"module:read\", \"module:create\", \"module:update\", \"lesson:read\", \"lesson:create\", \"progress:read\", \"progress:update\", \"quiz:submit\", \"chat:use\", \"student:read\", \"student:list\", \"student:create\", \"student:update\"],\n};\n\nexport function assertCan(user: User, permission: string, tenant: Tenant) {\n  const allowed = PERMISSIONS[user.role] ?? [];\n  if (!allowed.includes(permission)) {\n    throw new AuthError(`Permission denied: role '${user.role}' cannot '${permission}'`);\n  }\n  if (user.schoolId !== tenant.schoolId) {\n    throw new AuthError(\"Access denied: wrong school\");\n  }\n}",
              },
              {
                heading: "Apply assertCan to Domain Functions",
                body: "Every domain function that modifies data calls assertCan first. Students can only update their own progress.",
                code: "export async function updateProgress({ db, user, tenant, input }) {\n  assertCan(user, \"progress:update\", tenant);\n  if (user.role === \"student\" && input.studentId !== user.id) {\n    throw new AuthError(\"Students can only update their own progress\");\n  }\n  const [result] = await db.update(progress).set({\n    status: input.status, score: input.score,\n  }).where(and(\n    eq(progress.studentId, input.studentId),\n    eq(progress.lessonId, input.lessonId),\n    eq(progress.schoolId, tenant.schoolId)\n  )).returning();\n  return result;\n}",
              },
              {
                heading: "Conditional UI Based on Role",
                body: "Show or hide UI elements based on the user's role. Never rely on UI alone for security — always validate server-side.",
                code: "\"use client\";\nimport { useAuth } from \"@/hooks/useAuth\";\n\nexport function AdminOnly({ children }: { children: React.ReactNode }) {\n  const { user } = useAuth();\n  if (user?.role !== \"admin\") return null;\n  return <>{children}</>;\n}\n\n// Usage\n<AdminOnly>\n  <button>Create Module</button>\n</AdminOnly>",
              },
            ],
          },
        },
        {
          title: "Authentication Exercise + Quiz",
          description:
            "Add authentication to a blog API and test your auth knowledge.",
          order: 4,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the authentication exercise by adding login, logout, sessions, and RBAC to a blog API.",
          },
          exercises: [
            {
              title: "Add Auth to the Blog API",
              instructions:
                "Fork the exercise repo and add auth: create users table with passwordHash and role, implement POST /api/auth/login with session cookie, implement POST /api/auth/logout, implement GET /api/auth/session, add middleware to protect routes, add assertCan to every domain function, add protectedProcedure to mutations, create a login page, create useAuth hook, show UI conditionally based on role.",
              starterCode:
                "// TODO: Add users table with passwordHash and role\n// TODO: Implement login route\n// TODO: Implement logout route\n// TODO: Implement session route\n// TODO: Add middleware\n// TODO: Add assertCan to domain functions\n// TODO: Add protectedProcedure\n// TODO: Create login page\n// TODO: Create useAuth hook",
              expectedOutput:
                "A fully authenticated blog API with login, logout, sessions, RBAC, and conditional UI",
              hintsJson: [
                "Use bcrypt to hash passwords before storing",
                "Use httpOnly cookies for session tokens to prevent XSS",
                "Always validate permissions server-side — never trust the UI",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "Why use `httpOnly` cookies for session tokens?",
              optionsJson: [
                "They are faster",
                "Prevents JavaScript access — protects against XSS",
                "They look better",
                "Required by all browsers",
              ],
              correctAnswer: "Prevents JavaScript access — protects against XSS",
              explanation:
                "httpOnly cookies cannot be accessed by JavaScript, preventing XSS attacks from stealing session tokens.",
              order: 1,
            },
            {
              question: "What is the difference between authentication and authorization?",
              optionsJson: [
                "They are the same",
                "Authentication = who you are; Authorization = what you can do",
                "Authentication is faster",
                "Authorization is optional",
              ],
              correctAnswer: "Authentication = who you are; Authorization = what you can do",
              explanation:
                "Authentication proves identity (login). Authorization decides permissions (what actions are allowed).",
              order: 2,
            },
            {
              question: "Where should `assertCan()` be called?",
              optionsJson: [
                "In the router only",
                "In the domain function, before any mutation",
                "In the frontend only",
                "In the database",
              ],
              correctAnswer: "In the domain function, before any mutation",
              explanation:
                "assertCan() must be called in the domain function before any mutation. Never rely on the router or UI alone.",
              order: 3,
            },
            {
              question: "What does RBAC stand for?",
              optionsJson: [
                "Really Big Access Control",
                "Role-Based Access Control",
                "Runtime Browser Access Control",
                "Router-Based Authentication Control",
              ],
              correctAnswer: "Role-Based Access Control",
              explanation:
                "RBAC = Role-Based Access Control. Permissions are assigned to roles, and users inherit permissions through their roles.",
              order: 4,
            },
            {
              question: "Why check `user.schoolId !== tenant.schoolId`?",
              optionsJson: [
                "It is required by TypeScript",
                "Multi-tenant security — prevents cross-school data access",
                "It makes queries faster",
                "It validates the password",
              ],
              correctAnswer: "Multi-tenant security — prevents cross-school data access",
              explanation:
                "In a multi-tenant system, users belong to a school and can only access that school's data. This check enforces that boundary.",
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

export function getPhaseBCurriculumData() {
  const modules: CurriculumModule[] = [
    // ─── Module 7: React ──────────────────────────────────────
    {
      title: "React",
      description:
        "Build interactive user interfaces with React 19.2.5: components, JSX, props, state, hooks, composition, and lists.",
      slug: "react",
      order: 7,
      phase: "B",
      status: "published",
      lessons: [
        {
          title: "Components and JSX",
          description:
            "Learn React components, JSX syntax, props, composition, and how to build your first component.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "What is React?",
                body: "React is a library for building user interfaces with reusable components. Components are functions that return JSX (HTML-like syntax). React 19.2.5 is the version used in the Reading Advantage monorepo.",
                code: "// A simple component\nfunction Greeting({ name }: { name: string }) {\n  return <h1>Hello, {name}!</h1>;\n}\n\n// Usage\n<Greeting name=\"Alice\" />",
              },
              {
                heading: "JSX Rules",
                body: "JSX looks like HTML but has important differences: return a single root element (or use Fragment <>...</>), use className instead of class, use {} for JavaScript expressions, and self-closing tags require a slash.",
                code: "// ✅ Correct JSX\nfunction Card() {\n  return (\n    <div className=\"card\">\n      <img src=\"/photo.jpg\" alt=\"Photo\" />\n      <h2>Title</h2>\n    </div>\n  );\n}\n\n// ❌ Wrong — multiple roots\nfunction Bad() {\n  return <h1>A</h1><p>B</p>;\n}\n\n// ✅ Fixed with Fragment\nfunction Good() {\n  return (\n    <>\n      <h1>A</h1>\n      <p>B</p>\n    </>\n  );\n}",
              },
              {
                heading: "Composition with Props",
                body: "Props pass data from parent to child components. This is how you make components reusable. The key prop is required when rendering lists — it helps React efficiently update the DOM.",
                code: "interface ModuleCardProps {\n  title: string;\n  description: string;\n  progress: number;\n}\n\nexport function ModuleCard({ title, description, progress }: ModuleCardProps) {\n  return (\n    <div className=\"rounded-lg border p-6\">\n      <h3 className=\"text-xl font-semibold\">{title}</h3>\n      <p className=\"mt-2 text-sm text-gray-500\">{description}</p>\n      <div className=\"mt-4 h-2 rounded-full bg-gray-200\">\n        <div className=\"h-full bg-blue-500\" style={{ width: `${progress}%` }} />\n      </div>\n    </div>\n  );\n}\n\n// Composition in parent\n{modules.map((mod) => (\n  <ModuleCard key={mod.id} {...mod} />\n))}",
              },
            ],
          },
        },
        {
          title: "useState and Event Handling",
          description:
            "Manage component state with useState and handle user interactions with events.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "The useState Hook",
                body: "useState lets components remember values between renders. It returns an array with the current state and a setter function. Never mutate state directly — always use the setter.",
                code: "import { useState } from \"react\";\n\nexport function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div className=\"flex items-center gap-4\">\n      <button onClick={() => setCount(count - 1)}>-</button>\n      <span className=\"text-2xl font-bold\">{count}</span>\n      <button onClick={() => setCount(count + 1)}>+</button>\n    </div>\n  );\n}\n\n// Rules of useState:\n// 1. Never mutate state directly\n// 2. State updates are asynchronous\n// 3. Use functional updates when new state depends on old: setCount(prev => prev + 1)\n// 4. Initialize once — the argument is only used on the first render",
              },
              {
                heading: "Controlled Inputs",
                body: "A controlled input ties its value to React state. The input's value comes from state, and onChange updates state. This is the standard pattern for all form inputs in React.",
                code: "export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {\n  const [query, setQuery] = useState(\"\");\n\n  return (\n    <input\n      type=\"text\"\n      value={query}\n      onChange={(e) => {\n        setQuery(e.target.value);\n        onSearch(e.target.value);\n      }}\n      placeholder=\"Search modules...\"\n      className=\"w-full rounded-lg border px-4 py-2\"\n    />\n  );\n}",
              },
              {
                heading: "Expanding Module Card",
                body: "Combine useState with conditional rendering to create an interactive component that shows and hides additional content.",
                code: "export function ModuleCard({ title, lessons }: { title: string; lessons: string[] }) {\n  const [isExpanded, setIsExpanded] = useState(false);\n\n  return (\n    <div className=\"rounded-lg border p-6\">\n      <h3>{title}</h3>\n      <button onClick={() => setIsExpanded(!isExpanded)}>\n        {isExpanded ? \"Hide\" : \"Show\"} lessons\n      </button>\n      {isExpanded && (\n        <ul>\n          {lessons.map((lesson, i) => (\n            <li key={i}>{lesson}</li>\n          ))}\n        </ul>\n      )}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "useEffect and Data Fetching",
          description:
            "Run side effects with useEffect: fetch data, set up subscriptions, and manage timers.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "useEffect Basics",
                body: "useEffect runs code after the component renders. The dependency array controls when it re-runs: no array runs after every render, [] runs once on mount, and [dep1, dep2] runs when deps change.",
                code: "import { useState, useEffect } from \"react\";\n\n// Runs once on mount\nuseEffect(() => {\n  console.log(\"Component mounted\");\n}, []);\n\n// Runs when count changes\nuseEffect(() => {\n  console.log(`Count: ${count}`);\n}, [count]);\n\n// Cleanup function\nuseEffect(() => {\n  const timer = setInterval(() => setTime(Date.now()), 1000);\n  return () => clearInterval(timer);\n}, []);",
              },
              {
                heading: "Fetching Data with useEffect",
                body: "Fetch data inside useEffect with an empty dependency array. Track loading and error states for a complete data-fetching pattern.",
                code: "export function useModules() {\n  const [modules, setModules] = useState<Module[]>([]);\n  const [isLoading, setIsLoading] = useState(true);\n  const [error, setError] = useState<string | null>(null);\n\n  useEffect(() => {\n    const fetchModules = async () => {\n      try {\n        const response = await fetch(\"/data/modules.json\");\n        if (!response.ok) throw new Error(`HTTP ${response.status}`);\n        const data = await response.json();\n        setModules(data);\n      } catch (err) {\n        setError(err instanceof Error ? err.message : \"Failed\");\n      } finally {\n        setIsLoading(false);\n      }\n    };\n    fetchModules();\n  }, []);\n\n  return { modules, isLoading, error };\n}",
              },
              {
                heading: "Loading and Error States",
                body: "Always handle three states: loading, success, and error. Show skeletons while loading, content on success, and friendly error messages on failure.",
                code: "function App() {\n  const { modules, isLoading, error } = useModules();\n\n  if (isLoading) return <ModuleCardSkeleton count={6} />;\n  if (error) return <ErrorDisplay message={error} />;\n\n  return (\n    <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n      {modules.map((mod) => (\n        <ModuleCard key={mod.id} {...mod} />\n      ))}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "useContext and Prop Drilling",
          description:
            "Share data across many component levels without passing props through every level.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "The Prop Drilling Problem",
                body: "Props pass data down one level at a time. When many levels need the same data, you end up passing props through components that don't use them. Context solves this.",
                code: "// Without context: theme passed through 3 levels\n<App theme=\"dark\">\n  <Header theme=\"dark\">\n    <Nav theme=\"dark\">\n      <ThemeToggle theme=\"dark\" />\n    </Nav>\n  </Header>\n</App>\n\n// With context: no prop drilling\n<ThemeProvider>\n  <App />\n</ThemeProvider>",
              },
              {
                heading: "Creating and Using Context",
                body: "Create a context with createContext, provide it with a Provider, and consume it with useContext. Always throw an error if useContext is called outside the Provider.",
                code: "import { createContext, useContext, useState, type ReactNode } from \"react\";\n\ninterface ThemeContextType {\n  theme: \"light\" | \"dark\";\n  toggleTheme: () => void;\n}\n\nconst ThemeContext = createContext<ThemeContextType | undefined>(undefined);\n\nexport function ThemeProvider({ children }: { children: ReactNode }) {\n  const [theme, setTheme] = useState<\"light\" | \"dark\">(\"light\");\n  const toggleTheme = () => setTheme((prev) => (prev === \"light\" ? \"dark\" : \"light\"));\n  return (\n    <ThemeContext.Provider value={{ theme, toggleTheme }}>\n      {children}\n    </ThemeContext.Provider>\n  );\n}\n\nexport function useTheme() {\n  const context = useContext(ThemeContext);\n  if (!context) throw new Error(\"useTheme must be inside ThemeProvider\");\n  return context;\n}",
              },
              {
                heading: "When to Use Context vs Props",
                body: "Use context for data needed by many components at different levels (theme, auth, locale). Use props for direct parent-child data flow. Don't use context for data that changes frequently.",
                code: "// Use context for: theme, auth state, locale\n// Use props for: direct parent → child, 1–2 levels\n\n// Best practice: push \"use client\" as far down the tree as possible\n// Keep parent components as Server Components for performance",
              },
            ],
          },
        },
        {
          title: "Lists, Keys, and Conditional Rendering",
          description:
            "Render lists efficiently with proper keys and show/hide elements with conditional rendering patterns.",
          order: 5,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Keys Matter",
                body: "React uses keys to match old elements with new elements during re-render. Bad keys cause bugs, lost focus, and poor performance. Never use array index as a key for lists that can reorder or delete items.",
                code: "// ✅ Correct — unique, stable key from data\n{modules.map((mod) => (\n  <ModuleCard key={mod.id} title={mod.title} />\n))}\n\n// ❌ Wrong — array index as key\n{modules.map((mod, index) => (\n  <ModuleCard key={index} title={mod.title} />\n))}\n\n// ❌ Wrong — duplicate keys\n{items.map((item) => (\n  <li key={item.category}>{item.name}</li>\n))}",
              },
              {
                heading: "Conditional Rendering Patterns",
                body: "Use ternary for either/or, && for show/hide, early return for guard clauses, and enum objects for multiple states.",
                code: "// Ternary\n{isLoading ? <Spinner /> : <Content />}\n\n// && operator\n{error && <ErrorMessage>{error}</ErrorMessage>}\n\n// Early return\nif (isLoading) return <Spinner />;\nif (error) return <ErrorMessage>{error}</ErrorMessage>;\nreturn <Content />;\n\n// Enum object\nconst statusComponents = {\n  idle: <IdleState />,\n  loading: <LoadingState />,\n  success: <SuccessState data={data} />,\n  error: <ErrorState message={error} />,\n};\nreturn statusComponents[status];",
              },
              {
                heading: "Building a Filtered Lesson List",
                body: "Combine list rendering, filtering, and conditional rendering to build a practical component.",
                code: "export function LessonList({ lessons, filter }: { lessons: Lesson[]; filter: string }) {\n  const filtered = filter === \"all\"\n    ? lessons\n    : lessons.filter((l) => l.type === filter);\n\n  return (\n    <div className=\"space-y-3\">\n      {filtered.length === 0 && (\n        <p className=\"text-center text-gray-400\">No lessons match.</p>\n      )}\n      {filtered.map((lesson) => (\n        <LessonItem key={lesson.id} lesson={lesson} />\n      ))}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Forms and Custom Hooks",
          description:
            "Build forms with controlled inputs and extract reusable logic into custom hooks.",
          order: 6,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Controlled Form Pattern",
                body: "A controlled form ties every input to React state. Validate on submit with Zod and show field-level errors.",
                code: "import { useState, type FormEvent } from \"react\";\nimport { z } from \"zod\";\n\nconst contactSchema = z.object({\n  name: z.string().min(1, \"Name is required\"),\n  email: z.string().email(\"Invalid email\"),\n  message: z.string().min(10, \"Message too short\"),\n});\n\nexport function ContactForm() {\n  const [formData, setFormData] = useState({ name: \"\", email: \"\", message: \"\" });\n  const [errors, setErrors] = useState<Record<string, string>>({});\n\n  const handleSubmit = (e: FormEvent) => {\n    e.preventDefault();\n    const result = contactSchema.safeParse(formData);\n    if (!result.success) {\n      const fieldErrors: Record<string, string> = {};\n      result.error.issues.forEach((issue) => {\n        fieldErrors[issue.path[0].toString()] = issue.message;\n      });\n      setErrors(fieldErrors);\n      return;\n    }\n    console.log(\"Submitted!\", formData);\n  };\n\n  return (\n    <form onSubmit={handleSubmit} className=\"space-y-4\">\n      <input\n        value={formData.name}\n        onChange={(e) => setFormData({ ...formData, name: e.target.value })}\n        placeholder=\"Name\"\n      />\n      {errors.name && <p className=\"text-red-500\">{errors.name}</p>}\n      <button type=\"submit\">Send</button>\n    </form>\n  );\n}",
              },
              {
                heading: "Custom Hook — useFormState",
                body: "Extract form logic into a custom hook for reuse across multiple forms. Custom hooks are functions whose names start with 'use' and can call other hooks.",
                code: "export function useFormState<T extends Record<string, unknown>>(\n  schema: z.ZodType<T>,\n  initialValues: T\n) {\n  const [values, setValues] = useState(initialValues);\n  const [errors, setErrors] = useState<Record<string, string>>({});\n\n  const setValue = (field: keyof T, value: string) => {\n    setValues((prev) => ({ ...prev, [field]: value }));\n    setErrors((prev) => {\n      const next = { ...prev };\n      delete next[field as string];\n      return next;\n    });\n  };\n\n  const handleSubmit = (e: FormEvent) => {\n    e.preventDefault();\n    const result = schema.safeParse(values);\n    if (!result.success) {\n      const fieldErrors: Record<string, string> = {};\n      result.error.issues.forEach((issue) => {\n        fieldErrors[issue.path[0].toString()] = issue.message;\n      });\n      setErrors(fieldErrors);\n      return;\n    }\n    return values;\n  };\n\n  return { values, errors, setValue, handleSubmit };\n}",
              },
            ],
          },
        },
        {
          title: "React Exercise + Quiz",
          description:
            "Build a filterable data table with all React concepts learned and test your knowledge.",
          order: 7,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the React exercise by building a filterable student data table with sorting, search, and a theme toggle.",
          },
          exercises: [
            {
              title: "Build a Filterable Data Table",
              instructions:
                "Fork the exercise repo and build a filterable data table: render students from JSON, add search filtering by name, add department filter buttons, add sortable column headers, extract a useStudentFilters custom hook, implement a ThemeContext with light/dark toggle, show loading skeletons, and handle empty states.",
              starterCode:
                "// TODO: Create StudentTable component\n// TODO: Add SearchBar with controlled input\n// TODO: Add department filter buttons\n// TODO: Add sortable column headers\n// TODO: Extract useStudentFilters hook\n// TODO: Implement ThemeContext and ThemeToggle\n// TODO: Show skeleton while loading\n// TODO: Handle empty state",
              expectedOutput:
                "A fully interactive student table with search, filters, sorting, and theme toggle",
              hintsJson: [
                "Use useState for search query, filter, and sort state",
                "Extract filter/sort logic into a custom hook called useStudentFilters",
                "Create ThemeContext with createContext and useContext for the theme toggle",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question:
                "Why should you never use array index as a React key?",
              optionsJson: [
                "It is slower",
                "Causes bugs when items are reordered or deleted",
                "React ignores it",
                "It makes the code longer",
              ],
              correctAnswer:
                "Causes bugs when items are reordered or deleted",
              explanation:
                "Array indices change when items reorder, causing React to mismatch DOM elements. This leads to bugs, lost focus, and poor performance.",
              order: 1,
            },
            {
              question: "What is the dependency array in useEffect for?",
              optionsJson: [
                "To make the effect run faster",
                "Controls when the effect re-runs — only when listed deps change",
                "It is optional and can be omitted",
                "To declare variable types",
              ],
              correctAnswer:
                "Controls when the effect re-runs — only when listed deps change",
              explanation:
                "The dependency array tells React which values the effect depends on. The effect only re-runs when one of those values changes.",
              order: 2,
            },
            {
              question: "When should you use Context vs props?",
              optionsJson: [
                "Always use Context",
                "Context for data needed by many components at different levels; props for direct parent→child",
                "Props are deprecated in React 19",
                "Context is faster than props",
              ],
              correctAnswer:
                "Context for data needed by many components at different levels; props for direct parent→child",
              explanation:
                "Use Context when data is needed by many components at different nesting levels (theme, auth, locale). Use props for direct parent-child data flow.",
              order: 3,
            },
            {
              question: "What does a custom hook's name need to start with?",
              optionsJson: [
                "get",
                "use",
                "hook",
                "react",
              ],
              correctAnswer: "use",
              explanation:
                "Custom hooks must start with 'use'. This is a convention that React enforces via the Rules of Hooks linter.",
              order: 4,
            },
            {
              question: "What happens if you call useState inside a conditional?",
              optionsJson: [
                "It works fine",
                "Violates Rules of Hooks — hooks must be called in the same order every render",
                "It throws a syntax error",
                "The state is shared across components",
              ],
              correctAnswer:
                "Violates Rules of Hooks — hooks must be called in the same order every render",
              explanation:
                "Hooks must be called in the exact same order on every render. Conditionals can change the order, causing React to mismatch hook state.",
              order: 5,
            },
          ],
        },
      ],
    },
    // ─── Module 8: API Fundamentals ───────────────────────────
    {
      title: "API Fundamentals",
      description:
        "Understand HTTP methods, status codes, REST conventions, and the Fetch API for making requests to backend services.",
      slug: "api-fundamentals",
      order: 8,
      phase: "B",
      status: "published",
      lessons: [
        {
          title: "HTTP and REST Basics",
          description:
            "Learn HTTP request/response anatomy, methods, status codes, and REST URL conventions.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "HTTP Request/Response Anatomy",
                body: "APIs are how the frontend talks to the backend. The Reading Advantage frontend talks to the backend via tRPC — but underneath it is still HTTP. Every request has a method, URL, headers, and optional body. Every response has a status code and body.",
                code: "REQUEST:\nPOST /api/modules HTTP/1.1\nHost: localhost:3000\nContent-Type: application/json\n\n{\"title\": \"React\", \"description\": \"Learn React\"}\n\nRESPONSE:\nHTTP/1.1 201 Created\nContent-Type: application/json\n\n{\"id\": \"7\", \"title\": \"React\", \"description\": \"Learn React\"}",
              },
              {
                heading: "HTTP Methods",
                body: "HTTP methods define the action. GET reads, POST creates, PUT replaces, PATCH partially updates, DELETE removes. Idempotent methods produce the same result when called multiple times. Safe methods do not modify data.",
                code: "| Method | Purpose     | Idempotent | Safe |\n|--------|-------------|-----------|------|\n| GET    | Read data   | Yes       | Yes  |\n| POST   | Create data | No        | No   |\n| PUT    | Replace data| Yes       | No   |\n| PATCH  | Partial update| No      | No   |\n| DELETE | Remove data | Yes       | No   |\n\n// Idempotent: same result every time\n// Safe: does not modify data",
              },
              {
                heading: "HTTP Status Codes",
                body: "Status codes tell you what happened. 200s mean success, 300s mean redirection, 400s mean client error, 500s mean server error.",
                code: "| Range | Meaning      | Common Codes |\n|-------|-------------|--------------|\n| 200–299 | Success     | 200 OK, 201 Created, 204 No Content |\n| 300–399 | Redirection | 301 Moved Permanently, 304 Not Modified |\n| 400–499 | Client error| 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found |\n| 500–599 | Server error| 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |",
              },
              {
                heading: "REST URL Conventions",
                body: "REST APIs use nouns (not verbs) for URLs. Collections are plural. Nested resources show relationships.",
                code: "GET    /api/modules          → List all modules\nGET    /api/modules/7        → Get module 7\nPOST   /api/modules          → Create a new module\nPUT    /api/modules/7        → Replace module 7 entirely\nPATCH  /api/modules/7        → Update module 7 partially\nDELETE /api/modules/7        → Delete module 7\n\nGET    /api/modules/7/lessons     → List lessons in module 7\nPOST   /api/modules/7/lessons     → Add a lesson to module 7",
              },
            ],
          },
        },
        {
          title: "Fetch API — GET Requests",
          description:
            "Make GET requests with the Fetch API, parse JSON responses, and handle loading and error states.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Basic GET Request",
                body: "The Fetch API is built into modern browsers. Always check response.ok — fetch does not throw on 4xx or 5xx status codes. It only throws on network failures.",
                code: "export async function fetchModules() {\n  const response = await fetch(\"http://localhost:3001/modules\");\n\n  if (!response.ok) {\n    throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n  }\n\n  return response.json() as Promise<Module[]>;\n}\n\nexport async function fetchModule(id: string) {\n  const response = await fetch(`http://localhost:3001/modules/${id}`);\n\n  if (!response.ok) {\n    if (response.status === 404) {\n      throw new Error(\"Module not found\");\n    }\n    throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n  }\n\n  return response.json() as Promise<Module>;\n}",
              },
              {
                heading: "The useApi Hook",
                body: "Encapsulate data fetching in a reusable hook that tracks idle, loading, success, and error states using a discriminated union.",
                code: "type ApiState<T> =\n  | { status: \"idle\" }\n  | { status: \"loading\" }\n  | { status: \"success\"; data: T }\n  | { status: \"error\"; error: string };\n\nexport function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {\n  const [state, setState] = useState<ApiState<T>>({ status: \"idle\" });\n\n  useEffect(() => {\n    let cancelled = false;\n    const fetchData = async () => {\n      setState({ status: \"loading\" });\n      try {\n        const data = await fetcher();\n        if (!cancelled) setState({ status: \"success\", data });\n      } catch (error) {\n        if (!cancelled) {\n          setState({\n            status: \"error\",\n            error: error instanceof Error ? error.message : \"Unknown error\",\n          });\n        }\n      }\n    };\n    fetchData();\n    return () => { cancelled = true; };\n  }, deps);\n\n  return state;\n}",
              },
            ],
          },
        },
        {
          title: "POST, PUT, PATCH, DELETE",
          description:
            "Create, update, and delete data with the Fetch API. Build a reusable mutation hook.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "POST — Creating Data",
                body: "POST requests create new resources. Set the Content-Type header to application/json and send the body as a JSON string.",
                code: "export async function createModule(input: { title: string; description: string }) {\n  const response = await fetch(`${API_BASE}/modules`, {\n    method: \"POST\",\n    headers: { \"Content-Type\": \"application/json\" },\n    body: JSON.stringify(input),\n  });\n\n  if (!response.ok) {\n    throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n  }\n\n  return response.json() as Promise<Module>;\n}",
              },
              {
                heading: "PATCH and DELETE",
                body: "PATCH partially updates a resource. DELETE removes it. A successful DELETE often returns 204 No Content with no body.",
                code: "export async function updateModuleProgress(id: string, progress: number) {\n  const response = await fetch(`${API_BASE}/modules/${id}`, {\n    method: \"PATCH\",\n    headers: { \"Content-Type\": \"application/json\" },\n    body: JSON.stringify({ progress }),\n  });\n  if (!response.ok) throw new Error(`HTTP ${response.status}`);\n  return response.json();\n}\n\nexport async function deleteModule(id: string) {\n  const response = await fetch(`${API_BASE}/modules/${id}`, {\n    method: \"DELETE\",\n  });\n  if (!response.ok) throw new Error(`HTTP ${response.status}`);\n  if (response.status === 204) return null;\n  return response.json();\n}",
              },
              {
                heading: "Mutation Hook with Optimistic Updates",
                body: "A mutation hook tracks pending, error, and data states for write operations. Use useCallback to memoize the mutate function.",
                code: "export function useMutation<TInput, TOutput>(\n  mutationFn: (input: TInput) => Promise<TOutput>\n) {\n  const [isPending, setIsPending] = useState(false);\n  const [error, setError] = useState<string | null>(null);\n  const [data, setData] = useState<TOutput | null>(null);\n\n  const mutate = useCallback(async (input: TInput) => {\n    setIsPending(true);\n    setError(null);\n    try {\n      const result = await mutationFn(input);\n      setData(result);\n      return result;\n    } catch (err) {\n      const message = err instanceof Error ? err.message : \"Mutation failed\";\n      setError(message);\n      throw err;\n    } finally {\n      setIsPending(false);\n    }\n  }, [mutationFn]);\n\n  return { mutate, isPending, error, data };\n}",
              },
            ],
          },
        },
        {
          title: "Error Handling Patterns",
          description:
            "Classify errors, build a typed API client, and show user-friendly error messages.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Error Classification",
                body: "Not all errors are the same. Network errors mean the user is offline. API errors mean the server rejected the request. Distinguish them for better UX.",
                code: "class ApiError extends Error {\n  constructor(\n    public status: number,\n    public statusText: string,\n    public body?: unknown\n  ) {\n    super(`HTTP ${status}: ${statusText}`);\n    this.name = \"ApiError\";\n  }\n}\n\nclass NetworkError extends Error {\n  constructor(message: string) {\n    super(message);\n    this.name = \"NetworkError\";\n  }\n}\n\nfunction isApiError(error: unknown): error is ApiError {\n  return error instanceof ApiError;\n}\n\nfunction isNetworkError(error: unknown): error is NetworkError {\n  return error instanceof NetworkError;\n}",
              },
              {
                heading: "Typed API Client",
                body: "Wrap fetch in a reusable client that handles errors, parses JSON, and returns typed responses.",
                code: "export async function apiClient<T>(\n  url: string,\n  options: RequestInit = {}\n): Promise<T> {\n  try {\n    const response = await fetch(`${API_BASE}${url}`, {\n      ...options,\n      headers: {\n        \"Content-Type\": \"application/json\",\n        ...options.headers,\n      },\n    });\n\n    if (!response.ok) {\n      const body = await response.json().catch(() => null);\n      throw new ApiError(response.status, response.statusText, body);\n    }\n\n    if (response.status === 204) return null as T;\n    return response.json() as T;\n  } catch (error) {\n    if (error instanceof ApiError) throw error;\n    throw new NetworkError(\n      error instanceof Error ? error.message : \"Network request failed\"\n    );\n  }\n}",
              },
              {
                heading: "User-Facing Error Display",
                body: "Show different messages for different error types. Let users retry network errors. Guide them on authentication errors.",
                code: "export function ErrorDisplay({ error, onRetry }: { error: unknown; onRetry?: () => void }) {\n  if (isNetworkError(error)) {\n    return (\n      <div className=\"rounded-lg border border-red-200 bg-red-50 p-6 text-center\">\n        <p className=\"font-medium text-red-800\">Network Error</p>\n        <p className=\"mt-1 text-sm text-red-600\">Could not connect to the server.</p>\n        {onRetry && (\n          <button onClick={onRetry} className=\"mt-3 rounded-lg bg-red-600 px-4 py-2 text-white\">\n            Retry\n          </button>\n        )}\n      </div>\n    );\n  }\n\n  if (isApiError(error)) {\n    if (error.status === 401) {\n      return <p className=\"text-amber-600\">Please log in to continue.</p>;\n    }\n    if (error.status === 404) {\n      return <p className=\"text-gray-500\">The requested resource was not found.</p>;\n    }\n    return (\n      <div className=\"rounded-lg border border-red-200 bg-red-50 p-4\">\n        <p className=\"text-red-800\">Server error ({error.status})</p>\n        <p className=\"text-sm text-red-600\">{error.statusText}</p>\n      </div>\n    );\n  }\n\n  return <p className=\"text-red-600\">An unexpected error occurred.</p>;\n}",
              },
            ],
          },
        },
        {
          title: "API Fundamentals Exercise + Quiz",
          description:
            "Build a full CRUD client for a notes app and test your API knowledge.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the API exercise by building a notes CRUD client with typed error handling.",
          },
          exercises: [
            {
              title: "Build a CRUD Client",
              instructions:
                "Fork the exercise repo and build a notes CRUD client: create a typed apiClient<T> with ApiError and NetworkError handling, GET /notes to display cards, POST /notes to create via form, PATCH /notes/:id for inline editing, DELETE /notes/:id with confirmation, use useApi for reads and useMutation for writes, show loading skeletons, show user-friendly error messages, add client-side search filtering, and refetch after mutations.",
              starterCode:
                "// TODO: Create apiClient<T> with error classification\n// TODO: Create useApi hook for reads\n// TODO: Create useMutation hook for writes\n// TODO: Build NotesList with cards\n// TODO: Build NoteForm for creation\n// TODO: Add inline edit and delete\n// TODO: Add search filter\n// TODO: Refetch after mutations",
              expectedOutput:
                "A fully functional notes CRUD app with typed errors, loading states, and search",
              hintsJson: [
                "Use apiClient<T> for all fetch calls — it handles errors uniformly",
                "Use useApi(() => apiClient<Note[]>('/notes'), []) for reading",
                "After create/update/delete, refetch the list to show updated data",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What HTTP method do you use to create a new resource?",
              optionsJson: ["GET", "POST", "PUT", "PATCH"],
              correctAnswer: "POST",
              explanation:
                "POST creates a new resource. GET reads, PUT replaces, PATCH partially updates.",
              order: 1,
            },
            {
              question: "What does a 404 status code mean?",
              optionsJson: [
                "Server error",
                "Unauthorized",
                "The requested resource was not found",
                "Bad request",
              ],
              correctAnswer: "The requested resource was not found",
              explanation:
                "404 Not Found means the URL does not correspond to any existing resource on the server.",
              order: 2,
            },
            {
              question: "Why do you check response.ok after fetch?",
              optionsJson: [
                "fetch throws on 4xx/5xx automatically",
                "fetch only throws on network failures; response.ok checks HTTP status",
                "It is required by TypeScript",
                "It makes the request faster",
              ],
              correctAnswer:
                "fetch only throws on network failures; response.ok checks HTTP status",
              explanation:
                "fetch resolves successfully even for 404 and 500 responses. You must check response.ok to detect HTTP errors.",
              order: 3,
            },
            {
              question: "What is the difference between PUT and PATCH?",
              optionsJson: [
                "They are identical",
                "PUT replaces the entire resource; PATCH updates partially",
                "PATCH replaces; PUT updates partially",
                "PUT is for reading; PATCH is for writing",
              ],
              correctAnswer:
                "PUT replaces the entire resource; PATCH updates partially",
              explanation:
                "PUT sends the full replacement object. PATCH sends only the fields that changed.",
              order: 4,
            },
            {
              question: "What should you do when a mutation succeeds?",
              optionsJson: [
                "Nothing — the UI updates automatically",
                "Refetch the relevant data to show the updated state",
                "Reload the entire page",
                "Show an alert",
              ],
              correctAnswer:
                "Refetch the relevant data to show the updated state",
              explanation:
                "After a mutation, refetch the data that changed so the UI reflects the server state.",
              order: 5,
            },
          ],
        },
      ],
    },
    // ─── Module 9: Next.js 16 — Basics ────────────────────────
    {
      title: "Next.js 16 — Basics",
      description:
        "Migrate your React SPA to Next.js 16.0.0: App Router, Server Components, data fetching, dynamic routes, and layouts.",
      slug: "nextjs-basics",
      order: 9,
      phase: "B",
      status: "published",
      lessons: [
        {
          title: "App Router File Conventions",
          description:
            "Learn Next.js App Router file conventions: layout, page, loading, and error files.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Project Structure",
                body: "Next.js 16.0.0 uses the file system to define routes. The App Router in src/app/ uses special file names: layout.tsx wraps pages, page.tsx defines the UI, loading.tsx shows loading states, and error.tsx catches errors. All Reading Advantage apps are built with TypeScript 5.9.3 and Next.js 16.0.0.",
                code: "src/app/\n├── layout.tsx       # Root layout (wraps everything)\n├── page.tsx         # Home page (/)\n├── globals.css      # Global styles\n├── modules/\n│   ├── page.tsx     # Module list (/modules)\n│   └── [slug]/\n│       └── page.tsx # Module detail (/modules/:slug)\n├── loading.tsx      # Auto loading state\n└── error.tsx        # Auto error boundary",
              },
              {
                heading: "Layout and Page Files",
                body: "layout.tsx wraps all pages in its directory and persists across navigation. page.tsx defines the UI for a route.",
                code: "// layout.tsx — wraps all pages\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>\n        <nav>\n          <a href=\"/\">Dashboard</a>\n          <a href=\"/modules\">Modules</a>\n        </nav>\n        {children}\n      </body>\n    </html>\n  );\n}\n\n// page.tsx — defines the UI for a route\nexport default function HomePage() {\n  return <h1>Welcome to the Learning Dashboard</h1>;\n}",
              },
              {
                heading: "Loading and Error Files",
                body: "loading.tsx is shown while page data is loading via Suspense. error.tsx catches errors in Server Components and shows a fallback UI.",
                code: "// loading.tsx — shown while page loads\nexport default function Loading() {\n  return <div className=\"animate-pulse\">Loading...</div>;\n}\n\n// error.tsx — catches errors (must be a Client Component)\n\"use client\";\n\nexport default function Error({\n  error,\n  reset,\n}: {\n  error: Error & { digest?: string };\n  reset: () => void;\n}) {\n  return (\n    <div>\n      <h2>Something went wrong!</h2>\n      <button onClick={reset}>Try again</button>\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Server Components vs Client Components",
          description:
            "Understand the boundary between Server Components and Client Components in the App Router.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Server Components (default)",
                body: "Server Components run on the server by default. They can do async/await, direct database access, and keep secrets safe. They cannot use hooks, events, or browser APIs.",
                code: "// Server Component — no \"use client\" needed\nexport default async function ModuleList() {\n  const modules = await fetchModules(); // Server-side fetch!\n\n  return (\n    <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n      {modules.map((mod) => (\n        <ModuleCard key={mod.id} module={mod} />\n      ))}\n    </div>\n  );\n}\n\n// ✅ Can do: async/await, DB access, env vars\n// ❌ Cannot do: useState, useEffect, onClick, localStorage",
              },
              {
                heading: "Client Components",
                body: "Add the 'use client' directive to make a component run in the browser. Client Components can use hooks, handle events, and access browser APIs.",
                code: "\"use client\";\n\nimport { useState } from \"react\";\n\nexport function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {\n  const [query, setQuery] = useState(\"\");\n\n  return (\n    <input\n      value={query}\n      onChange={(e) => {\n        setQuery(e.target.value);\n        onSearch(e.target.value);\n      }}\n      placeholder=\"Search...\"\n    />\n  );\n}\n\n// The boundary rule: \"use client\" marks the boundary\n// Components imported by a Client Component are also Client Components",
              },
              {
                heading: "Composition Pattern",
                body: "Push 'use client' as far down the tree as possible. Keep parent components as Server Components for maximum performance. Server Components can pass data as props to Client Components.",
                code: "// Server Component (default)\nexport default async function ModulesPage() {\n  const modules = await fetchModules();\n\n  return (\n    <div>\n      <ModuleSearch />  {/* Client — handles input */}\n      <ModuleList modules={modules} />  {/* Server — renders data */}\n    </div>\n  );\n}\n\n// Best practice: Server wraps Client\n// Server fetches data → passes to Client for interactivity",
              },
            ],
          },
        },
        {
          title: "Data Fetching in Server Components",
          description:
            "Fetch data directly in Server Components with async/await. No useEffect needed.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Server-Side Data Fetching",
                body: "In Server Components, fetch data directly with async/await. No useEffect, no loading state management. Next.js handles the loading UI with loading.tsx.",
                code: "async function getModules() {\n  const response = await fetch(\"http://localhost:3001/modules\", {\n    cache: \"no-store\", // Always fresh\n  });\n  if (!response.ok) throw new Error(\"Failed to fetch\");\n  return response.json() as Promise<Module[]>;\n}\n\nexport default async function HomePage() {\n  const modules = await getModules();\n\n  return (\n    <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n      {modules.map((mod) => (\n        <ModuleCard key={mod.id} module={mod} />\n      ))}\n    </div>\n  );\n}",
              },
              {
                heading: "Caching Strategies",
                body: "Next.js fetch has built-in caching. Default caches until revalidated (like SSG). Use cache: no-store for always fresh (like SSR). Use next.revalidate for ISR.",
                code: "// Default: cached until revalidated (SSG-like)\nfetch(url);\n\n// Always fresh (SSR-like)\nfetch(url, { cache: \"no-store\" });\n\n// Revalidate every 60 seconds (ISR)\nfetch(url, { next: { revalidate: 60 } });",
              },
              {
                heading: "Parallel Data Fetching",
                body: "Fetch multiple resources in parallel with Promise.all. This is much faster than sequential fetching.",
                code: "export default async function ModuleDetailPage(\n  { params }: { params: Promise<{ slug: string }> }\n) {\n  const { slug } = await params;\n  const [module, lessons, progress] = await Promise.all([\n    getModule(slug),\n    getLessons(slug),\n    getProgress(slug),\n  ]);\n\n  return (\n    <div>\n      <ModuleHeader module={module} />\n      <LessonList lessons={lessons} progress={progress} />\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Dynamic Routes and Navigation",
          description:
            "Build dynamic routes and navigate between pages with Link and useRouter.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Dynamic Route Segments",
                body: "Dynamic routes handle URLs with variable segments. In Next.js 16, params is a Promise — you must await it.",
                code: "// File: src/app/modules/[slug]/page.tsx\n// URL: /modules/react-basics\n\ninterface Props {\n  params: Promise<{ slug: string }>;\n}\n\nexport default async function ModuleDetailPage({ params }: Props) {\n  const { slug } = await params;\n  const module = await getModule(slug);\n\n  if (!module) {\n    return <div>Module not found</div>;\n  }\n\n  return (\n    <div>\n      <h1>{module.title}</h1>\n      <p>{module.description}</p>\n      <LessonList lessons={module.lessons} />\n    </div>\n  );\n}",
              },
              {
                heading: "Navigation with Link",
                body: "Use next/link for client-side navigation without full page reloads. Avoid <a> for internal links.",
                code: "import Link from \"next/link\";\n\n// Client-side navigation — no full page reload!\n<Link href=\"/modules\">All Modules</Link>\n<Link href={`/modules/${module.slug}`}>{module.title}</Link>\n\n// vs. <a> tag — full page reload (avoid for internal links)\n<a href=\"/modules\">All Modules</a>  // ❌ Don't do this internally",
              },
              {
                heading: "Programmatic Navigation",
                body: "Use useRouter from next/navigation for programmatic navigation in Client Components.",
                code: "\"use client\";\n\nimport { useRouter } from \"next/navigation\";\n\nexport function QuizComplete({ moduleSlug }: { moduleSlug: string }) {\n  const router = useRouter();\n\n  return (\n    <div>\n      <p>Quiz complete!</p>\n      <button onClick={() => router.push(`/modules/${moduleSlug}`)}>\n        Back to Module\n      </button>\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Layouts and Nested Routing",
          description:
            "Build layout hierarchies and use route groups for organized page shells.",
          order: 5,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Layout Hierarchy",
                body: "Layouts wrap pages and persist across navigation. Nested layouts allow different UI shells for different route groups.",
                code: "// Root layout (required)\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\">\n      <body>\n        <nav>\n          <Link href=\"/\">Dashboard</Link>\n          <Link href=\"/modules\">Modules</Link>\n        </nav>\n        {children}\n      </body>\n    </html>\n  );\n}\n\n// Nested layout for modules\nexport default function ModulesLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <div className=\"flex\">\n      <aside className=\"w-64 border-r p-4\">\n        <ModuleSidebar />\n      </aside>\n      <div className=\"flex-1 p-6\">{children}</div>\n    </div>\n  );\n}",
              },
              {
                heading: "Route Groups",
                body: "Route groups (folder) don't create URL segments. They organize routes with shared layouts.",
                code: "app/\n├── (dashboard)/       → No URL segment\n│   ├── layout.tsx     → Dashboard layout\n│   ├── page.tsx       → / (home)\n│   └── modules/\n├── (auth)/            → No URL segment\n│   ├── layout.tsx     → Auth layout\n│   └── login/\n│       └── page.tsx   → /login",
              },
            ],
          },
        },
        {
          title: "Next.js Basics Exercise + Quiz",
          description:
            "Build a multi-page Next.js app with dynamic routes, layouts, and server-side data fetching.",
          order: 6,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the Next.js exercise by building a multi-page app with server-side data fetching.",
          },
          exercises: [
            {
              title: "Build a Multi-Page Next.js App",
              instructions:
                "Fork the exercise repo and build a multi-page Next.js app: create a home page that fetches modules (Server Component), create /modules/[slug] dynamic route for module detail, create /modules/[slug]/lessons/[id] for lesson view, add a root layout with navigation (Link components), add loading.tsx for modules page skeleton, add error.tsx for module detail with retry button, use Server Components for data fetching, add \"use client\" only where needed, fetch module list in a layout sidebar, and use Promise.all for parallel data fetching on detail pages.",
              starterCode:
                "// TODO: Create home page with server-side fetch\n// TODO: Create /modules/[slug]/page.tsx\n// TODO: Create /modules/[slug]/lessons/[id]/page.tsx\n// TODO: Add root layout with nav\n// TODO: Add loading.tsx\n// TODO: Add error.tsx\n// TODO: Add sidebar layout\n// TODO: Use Promise.all for parallel fetching",
              expectedOutput:
                "A multi-page Next.js app with dynamic routes, layouts, loading states, and server-side data fetching",
              hintsJson: [
                "Use async function for Server Components that fetch data",
                "Remember: params is a Promise in Next.js 16 — await it",
                "Push 'use client' as far down the tree as possible",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What file defines a route's UI in the App Router?",
              optionsJson: ["route.ts", "page.tsx", "layout.tsx", "index.tsx"],
              correctAnswer: "page.tsx",
              explanation:
                "page.tsx defines the UI for a route. layout.tsx wraps pages, route.ts defines API endpoints.",
              order: 1,
            },
            {
              question: "When do you need \"use client\"?",
              optionsJson: [
                "Always",
                "When using hooks, event handlers, or browser APIs",
                "Only for API routes",
                "Never in Next.js 16",
              ],
              correctAnswer:
                "When using hooks, event handlers, or browser APIs",
              explanation:
                "Client Components need the 'use client' directive when they use React hooks, handle events, or access browser-only APIs.",
              order: 2,
            },
            {
              question: "How do you fetch data in a Server Component?",
              optionsJson: [
                "With useEffect",
                "With async/await directly in the component",
                "With useQuery",
                "With fetch in useState",
              ],
              correctAnswer: "With async/await directly in the component",
              explanation:
                "Server Components can fetch data directly with async/await. No useEffect or client-side data fetching is needed.",
              order: 3,
            },
            {
              question: "What does loading.tsx do?",
              optionsJson: [
                "Shows a 404 page",
                "Automatic loading UI shown via Suspense while the page loads",
                "Handles errors",
                "Redirects to login",
              ],
              correctAnswer:
                "Automatic loading UI shown via Suspense while the page loads",
              explanation:
                "Next.js automatically wraps Server Component pages in Suspense and shows loading.tsx while data is being fetched.",
              order: 4,
            },
            {
              question:
                "What is the difference between <Link> and <a> for internal navigation?",
              optionsJson: [
                "There is no difference",
                "<Link> does client-side navigation without a full page reload",
                "<a> is faster",
                "<Link> only works for external URLs",
              ],
              correctAnswer:
                "<Link> does client-side navigation without a full page reload",
              explanation:
                "next/link provides client-side navigation that preserves state and is faster. Use <a> only for external links.",
              order: 5,
            },
          ],
        },
      ],
    },
    // ─── Module 10: Next.js 16 — Advanced ─────────────────────
    {
      title: "Next.js 16 — Advanced",
      description:
        "Productionize your Next.js app with Route Handlers, middleware, error boundaries, streaming, and optimization.",
      slug: "nextjs-advanced",
      order: 10,
      phase: "B",
      status: "published",
      lessons: [
        {
          title: "Route Handlers",
          description:
            "Build API endpoints with Route Handlers in the App Router.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "GET and POST Route Handlers",
                body: "Route Handlers live in app/api/.../route.ts. They handle HTTP requests and return responses using NextResponse. Input validation uses Zod 3.25.76 — the same runtime validation library used across the monorepo.",
                code: "// src/app/api/modules/route.ts\nimport { NextResponse } from \"next/server\";\n\nexport async function GET() {\n  const modules = await fetchModules();\n  return NextResponse.json(modules);\n}\n\nexport async function POST(request: Request) {\n  const body = await request.json();\n  const result = createModuleSchema.safeParse(body);\n  if (!result.success) {\n    return NextResponse.json(\n      { error: \"Invalid input\", details: result.error.issues },\n      { status: 400 }\n    );\n  }\n  const newModule = await createModule(result.data);\n  return NextResponse.json(newModule, { status: 201 });\n}",
              },
              {
                heading: "Dynamic Route Handlers",
                body: "Dynamic segments in route handlers let you build RESTful APIs.",
                code: "// src/app/api/quizzes/[lessonId]/route.ts\nexport async function POST(\n  request: Request,\n  { params }: { params: Promise<{ lessonId: string }> }\n) {\n  const { lessonId } = await params;\n  const body = await request.json();\n\n  const result = submitQuizSchema.safeParse(body);\n  if (!result.success) {\n    return NextResponse.json({ error: \"Invalid input\" }, { status: 400 });\n  }\n\n  const questions = await getQuizQuestions(lessonId);\n  const score = calculateScore(questions, result.data.answers);\n  await saveQuizResult(lessonId, score);\n\n  return NextResponse.json({ score, total: questions.length });\n}",
              },
              {
                heading: "Error Handling in Route Handlers",
                body: "Wrap route handlers in try/catch and return appropriate status codes.",
                code: "export async function POST(request: Request) {\n  try {\n    const body = await request.json();\n    // ... process\n    return NextResponse.json({ success: true });\n  } catch (error) {\n    if (error instanceof SyntaxError) {\n      return NextResponse.json({ error: \"Invalid JSON\" }, { status: 400 });\n    }\n    console.error(\"API error:\", error);\n    return NextResponse.json(\n      { error: \"Internal server error\" },\n      { status: 500 }\n    );\n  }\n}",
              },
            ],
          },
        },
        {
          title: "Middleware",
          description:
            "Run code before requests reach pages or API routes with Next.js middleware.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Basic Middleware",
                body: "Middleware runs before a request reaches a page or API route. Use the matcher config to limit which routes it runs on.",
                code: "// src/middleware.ts\nimport { NextResponse } from \"next/server\";\nimport type { NextRequest } from \"next/server\";\n\nexport function middleware(request: NextRequest) {\n  console.log(`Request: ${request.nextUrl.pathname}`);\n  return NextResponse.next();\n}\n\nexport const config = {\n  matcher: [\n    \"/modules/:path*\",\n    \"/chat/:path*\",\n    \"/api/((?!auth).)*\",\n  ],\n};",
              },
              {
                heading: "Auth Middleware",
                body: "Check for session cookies and redirect unauthenticated users to login.",
                code: "export function middleware(request: NextRequest) {\n  const sessionToken = request.cookies.get(\"session\")?.value;\n\n  if (!sessionToken) {\n    const loginUrl = new URL(\"/login\", request.url);\n    loginUrl.searchParams.set(\"from\", request.nextUrl.pathname);\n    return NextResponse.redirect(loginUrl);\n  }\n\n  const response = NextResponse.next();\n  response.headers.set(\"x-user-id\", decodeSessionToken(sessionToken));\n  return response;\n}\n\nexport const config = {\n  matcher: [\"/modules/:path*\", \"/chat/:path*\"],\n};",
              },
              {
                heading: "Middleware Patterns",
                body: "Redirect old URLs, rewrite requests, and add CORS headers.",
                code: "// Redirect old URLs\nif (request.nextUrl.pathname.startsWith(\"/course/\")) {\n  const newUrl = request.nextUrl.pathname.replace(\"/course/\", \"/modules/\");\n  return NextResponse.redirect(new URL(newUrl, request.url));\n}\n\n// Add CORS headers for API routes\nif (request.nextUrl.pathname.startsWith(\"/api/\")) {\n  const response = NextResponse.next();\n  response.headers.set(\"Access-Control-Allow-Origin\", \"*\");\n  response.headers.set(\"Access-Control-Allow-Methods\", \"GET, POST\");\n  return response;\n}",
              },
            ],
          },
        },
        {
          title: "Error Boundaries and Streaming",
          description:
            "Handle errors gracefully and stream parts of the page independently with Suspense.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Error Boundaries",
                body: "error.tsx catches errors in Server Components. not-found.tsx handles 404s. Both improve user experience when things go wrong.",
                code: "// error.tsx — catches runtime errors\n\"use client\";\n\nexport default function Error({\n  error,\n  reset,\n}: {\n  error: Error & { digest?: string };\n  reset: () => void;\n}) {\n  return (\n    <div className=\"flex flex-col items-center py-12\">\n      <h2 className=\"text-2xl font-bold text-red-600\">Something went wrong!</h2>\n      <p className=\"mt-2 text-gray-500\">{error.message}</p>\n      <button\n        onClick={reset}\n        className=\"mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white\">\n        Try again\n      </button>\n    </div>\n  );\n}\n\n// not-found.tsx — handles 404s\nexport default function NotFound() {\n  return (\n    <div className=\"flex flex-col items-center py-12\">\n      <h2 className=\"text-4xl font-bold\">404</h2>\n      <p className=\"mt-2 text-gray-500\">Page not found</p>\n      <Link href=\"/\" className=\"mt-4 text-blue-500 hover:underline\">\n        Go home\n      </Link>\n    </div>\n  );\n}",
              },
              {
                heading: "Streaming with Suspense",
                body: "Stream parts of the page independently so users see content progressively. Each Suspense boundary loads independently.",
                code: "import { Suspense } from \"react\";\n\nexport default function HomePage() {\n  return (\n    <div>\n      {/* Header renders immediately */}\n      <h1>Learning Dashboard</h1>\n\n      {/* Module list streams when ready */}\n      <Suspense fallback={<ModuleGridSkeleton />}>\n        <ModuleList />\n      </Suspense>\n\n      {/* Progress streams independently */}\n      <Suspense fallback={<ProgressSkeleton />}>\n        <ProgressSummary />\n      </Suspense>\n    </div>\n  );\n}\n\n// ModuleList fetches its own data\nasync function ModuleList() {\n  const modules = await getModules();\n  return (\n    <div className=\"grid gap-6 md:grid-cols-2 lg:grid-cols-3\">\n      {modules.map((mod) => (\n        <ModuleCard key={mod.id} module={mod} />\n      ))}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Image, Font, and Metadata Optimization",
          description:
            "Optimize images, fonts, and metadata for performance and SEO.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "next/image",
                body: "next/image automatically optimizes images: lazy loading, resizing, WebP/AVIF conversion, and layout shift prevention.",
                code: "import Image from \"next/image\";\n\n// Automatic optimization\n<Image\n  src=\"/photos/team.jpg\"\n  alt=\"Team photo\"\n  width={800}\n  height={600}\n  priority\n/>\n\n// Remote images — configure domains in next.config.ts\nconst nextConfig = {\n  images: {\n    remotePatterns: [\n      { protocol: \"https\", hostname: \"avatars.githubusercontent.com\" },\n    ],\n  },\n};",
              },
              {
                heading: "next/font",
                body: "next/font self-hosts fonts for zero layout shift, privacy, and performance.",
                code: "import { Inter } from \"next/font/google\";\n\nconst inter = Inter({ subsets: [\"latin\"] });\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang=\"en\" className={inter.className}>\n      <body>{children}</body>\n    </html>\n  );\n}",
              },
              {
                heading: "Metadata API",
                body: "Define static or dynamic metadata for SEO and social sharing.",
                code: "import type { Metadata } from \"next\";\n\n// Static metadata\nexport const metadata: Metadata = {\n  title: \"Learning Dashboard\",\n  description: \"Track your codecamp progress\",\n};\n\n// Dynamic metadata\nexport async function generateMetadata(\n  { params }: { params: Promise<{ slug: string }> }\n): Promise<Metadata> {\n  const { slug } = await params;\n  const module = await getModule(slug);\n  return {\n    title: `${module.title} — Learning Dashboard`,\n    description: module.description,\n  };\n}",
              },
            ],
          },
        },
        {
          title: "Next.js Advanced Exercise + Quiz",
          description:
            "Productionize your Next.js app with API routes, middleware, error handling, and optimization.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the Next.js Advanced exercise by adding API routes, middleware, and optimization.",
          },
          exercises: [
            {
              title: "Add API Routes and Streaming",
              instructions:
                "Fork the exercise repo and productionize your Next.js app: create POST /api/notes route handler with Zod validation, create GET /api/notes with optional category filter, create DELETE /api/notes/[id] route handler, add middleware that logs request method + path + duration, add middleware that checks mock session cookie on /notes/* routes, wrap notes list in Suspense with skeleton fallback, add error.tsx for notes page with retry button, add not-found.tsx for the app, use next/image for avatars, and add dynamic generateMetadata for note detail page.",
              starterCode:
                "// TODO: Create POST /api/notes with Zod validation\n// TODO: Create GET /api/notes with category filter\n// TODO: Create DELETE /api/notes/[id]\n// TODO: Add logging middleware\n// TODO: Add auth middleware\n// TODO: Add Suspense + skeleton\n// TODO: Add error.tsx and not-found.tsx\n// TODO: Use next/image\n// TODO: Add dynamic metadata",
              expectedOutput:
                "A production-ready Next.js app with API routes, middleware, error boundaries, and optimizations",
              hintsJson: [
                "Use NextResponse.json() to return JSON from route handlers",
                "Middleware matcher controls which routes run the middleware",
                "Use generateMetadata for dynamic page titles and descriptions",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What file do you create for an API endpoint in the App Router?",
              optionsJson: ["api.ts", "route.ts", "handler.ts", "endpoint.ts"],
              correctAnswer: "route.ts",
              explanation:
                "API endpoints in the App Router use route.ts files inside app/api/ directories.",
              order: 1,
            },
            {
              question: "When does Next.js middleware run?",
              optionsJson: [
                "After the page renders",
                "Before the request reaches a page or API route",
                "Only on the first request",
                "After the API response",
              ],
              correctAnswer:
                "Before the request reaches a page or API route",
              explanation:
                "Middleware runs before the request reaches its destination. It can redirect, rewrite, or modify the response.",
              order: 2,
            },
            {
              question: "How does streaming improve user experience?",
              optionsJson: [
                "It makes images load faster",
                "Users see content progressively instead of waiting for the entire page",
                "It reduces bundle size",
                "It enables offline mode",
              ],
              correctAnswer:
                "Users see content progressively instead of waiting for the entire page",
              explanation:
                "Streaming with Suspense sends parts of the page as they are ready. Users see content faster and independent sections load in parallel.",
              order: 3,
            },
            {
              question: "Why use next/image instead of <img>?",
              optionsJson: [
                "It is required by Next.js",
                "Automatic lazy loading, resizing, WebP conversion, and layout shift prevention",
                "It supports more image formats",
                "It is easier to type",
              ],
              correctAnswer:
                "Automatic lazy loading, resizing, WebP conversion, and layout shift prevention",
              explanation:
                "next/image optimizes images automatically: lazy loads below-the-fold images, serves the right size for each device, converts to modern formats, and prevents layout shift.",
              order: 4,
            },
            {
              question:
                "What is the difference between error.tsx and not-found.tsx?",
              optionsJson: [
                "They are the same",
                "error.tsx catches runtime errors; not-found.tsx handles 404s",
                "error.tsx handles 404s; not-found.tsx catches runtime errors",
                "not-found.tsx is deprecated",
              ],
              correctAnswer:
                "error.tsx catches runtime errors; not-found.tsx handles 404s",
              explanation:
                "error.tsx is an error boundary that catches runtime errors in its subtree. not-found.tsx renders when a page doesn't exist (404).",
              order: 5,
            },
          ],
        },
      ],
    },
  ];

  return { modules, exerciseRepos: getExerciseRepos(modules) };
}


export function getPhaseDCurriculumData() {
  const modules: CurriculumModule[] = [
    // ─── Module 14: Internationalization ──────────────────────
    {
      title: "Internationalization",
      description:
        "Add Thai and English language support to the Student Progress Tracker with next-intl 4.11.0: locale routing, message files, and component translations.",
      slug: "internationalization",
      order: 14,
      phase: "D",
      status: "published",
      lessons: [
        {
          title: "Setting Up next-intl",
          description:
            "Install and configure next-intl with locale routing, request config, and message files for English and Thai.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Install next-intl",
                body: "next-intl 4.11.0 is the i18n library used by Reading Advantage. It provides type-safe translations for both Server and Client Components.",
                code: "pnpm add next-intl@4.11.0\n\n// next.config.ts\nimport createNextIntlPlugin from \"next-intl/plugin\";\nconst withNextIntl = createNextIntlPlugin();\nexport default withNextIntl(nextConfig);",
              },
              {
                heading: "Configure Locale Routing",
                body: "Define supported locales and default locale. Create routing.ts and navigation.ts for locale-aware links.",
                code: "// src/i18n/routing.ts\nimport { defineRouting } from \"next-intl/routing\";\nexport const routing = defineRouting({\n  locales: [\"en\", \"th\"],\n  defaultLocale: \"en\",\n});\n\n// src/i18n/navigation.ts\nimport { createNavigation } from \"next-intl/navigation\";\nimport { routing } from \"./routing\";\nexport const { Link, redirect, usePathname, useRouter } =\n  createNavigation(routing);",
              },
              {
                heading: "Message Files",
                body: "Message files define all UI strings. Curriculum content stays in English — only UI chrome is translated.",
                code: "// messages/en.json\n{\n  \"dashboard\": {\n    \"title\": \"Learning Dashboard\",\n    \"subtitle\": \"Track your progress\",\n    \"overallProgress\": \"Overall Progress\"\n  },\n  \"module\": {\n    \"start\": \"Start Module\",\n    \"continue\": \"Continue\",\n    \"completed\": \"Completed\"\n  }\n}\n\n// messages/th.json\n{\n  \"dashboard\": {\n    \"title\": \"แดชบอร์ดการเรียนรู้\",\n    \"subtitle\": \"ติดตามความคืบหน้า\",\n    \"overallProgress\": \"ความคืบหน้าโดยรวม\"\n  },\n  \"module\": {\n    \"start\": \"เริ่มโมดูล\",\n    \"continue\": \"ดำเนินการต่อ\",\n    \"completed\": \"เสร็จสิ้น\"\n  }\n}",
              },
            ],
          },
        },
        {
          title: "Using Translations in Components",
          description:
            "Use getTranslations in Server Components and useTranslations in Client Components. Build a locale switcher.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Server Component Translations",
                body: "Server Components use getTranslations from next-intl/server. It's async because it reads the locale from the request.",
                code: "// src/app/[locale]/page.tsx\nimport { getTranslations } from \"next-intl/server\";\n\nexport default async function HomePage() {\n  const t = await getTranslations(\"dashboard\");\n  return (\n    <div>\n      <h1>{t(\"title\")}</h1>\n      <p>{t(\"subtitle\")}</p>\n    </div>\n  );\n}",
              },
              {
                heading: "Client Component Translations",
                body: "Client Components use the useTranslations hook. It works just like any other React hook.",
                code: "\"use client\";\nimport { useTranslations } from \"next-intl\";\n\nexport function ModuleCard({ module }: { module: Module }) {\n  const t = useTranslations(\"module\");\n  return (\n    <div>\n      <h3>{module.title}</h3>\n      <button>\n        {module.progress > 0 ? t(\"continue\") : t(\"start\")}\n      </button>\n    </div>\n  );\n}",
              },
              {
                heading: "Locale Switcher",
                body: "Build a locale switcher that changes the URL locale prefix and re-renders the page with new translations.",
                code: "\"use client\";\nimport { useLocale } from \"next-intl\";\nimport { useRouter, usePathname } from \"@/i18n/navigation\";\nimport { routing } from \"@/i18n/routing\";\n\nexport function LocaleSwitcher() {\n  const locale = useLocale();\n  const router = useRouter();\n  const pathname = usePathname();\n\n  return (\n    <div className=\"flex gap-2\">\n      {routing.locales.map((loc) => (\n        <button\n          key={loc}\n          onClick={() => router.replace(pathname, { locale: loc })}\n          className={locale === loc ? \"bg-blue-500 text-white\" : \"bg-gray-100\"}\n        >\n          {loc === \"en\" ? \"EN\" : \"ไทย\"}\n        </button>\n      ))}\n    </div>\n  );\n}",
              },
            ],
          },
        },
        {
          title: "Internationalization Exercise + Quiz",
          description:
            "Add i18n to a blog app and test your internationalization knowledge.",
          order: 3,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the i18n exercise by adding next-intl to a blog app with full Thai/English support.",
          },
          exercises: [
            {
              title: "Add i18n to the Blog App",
              instructions:
                "Fork the exercise repo and add next-intl 4.11.0: configure routing for en and th, create messages/en.json and messages/th.json with all UI strings, replace hardcoded strings in Server Components with getTranslations(), replace hardcoded strings in Client Components with useTranslations(), add a LocaleSwitcher component in the header, handle pluralization for comment counts, and use Link from next-intl/navigation for all internal navigation.",
              starterCode:
                "// TODO: Install next-intl and configure routing\n// TODO: Create message files\n// TODO: Replace hardcoded strings with translations\n// TODO: Add LocaleSwitcher\n// TODO: Handle pluralization\n// TODO: Use next-intl Link",
              expectedOutput:
                "A blog app with full Thai/English UI support and working locale switcher",
              hintsJson: [
                "Use getTranslations() in Server Components — it's async",
                "Use useTranslations() in Client Components — it's a React hook",
                "Use Link from next-intl/navigation, not next/link, for locale-aware routing",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What hook do you use in a Server Component?",
              optionsJson: [
                "useTranslations()",
                "getTranslations() — it's async",
                "useLocale()",
                "getLocale()",
              ],
              correctAnswer: "getTranslations() — it's async",
              explanation:
                "Server Components use getTranslations() from next-intl/server. It is async because it reads the locale from the request.",
              order: 1,
            },
            {
              question: "What hook do you use in a Client Component?",
              optionsJson: [
                "getTranslations()",
                "useTranslations() — it's a React hook",
                "useServerTranslations()",
                "getLocale()",
              ],
              correctAnswer: "useTranslations() — it's a React hook",
              explanation:
                "Client Components use useTranslations() from next-intl. It is a React hook that subscribes to locale changes.",
              order: 2,
            },
            {
              question: "How do you interpolate a variable in a message?",
              optionsJson: [
                "$variable",
                "{variableName} in the message, pass as second arg to t()",
                "%s",
                "{{variable}}",
              ],
              correctAnswer:
                "{variableName} in the message, pass as second arg to t()",
              explanation:
                "next-intl uses ICU message format. Use {variableName} in the message string and pass the value as the second argument to t().",
              order: 3,
            },
            {
              question:
                "Why use next-intl/navigation's Link instead of Next.js Link?",
              optionsJson: [
                "It is faster",
                "It automatically includes the locale prefix in the URL",
                "It is required by TypeScript",
                "It has more features",
              ],
              correctAnswer:
                "It automatically includes the locale prefix in the URL",
              explanation:
                "next-intl/navigation's Link automatically prepends the current locale to URLs. Next.js Link does not know about locales.",
              order: 4,
            },
            {
              question: "Should curriculum content be translated?",
              optionsJson: [
                "Yes, everything should be translated",
                "No — only UI chrome. Content stays in its original language.",
                "Only the quiz questions",
                "Only the exercise instructions",
              ],
              correctAnswer:
                "No — only UI chrome. Content stays in its original language.",
              explanation:
                "The curriculum content (lessons, code examples) stays in English. Only the UI chrome (buttons, labels, navigation) is translated.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 15: AI Integration ────────────────────────────
    {
      title: "AI Integration",
      description:
        "Integrate AI into the Student Progress Tracker with Vercel AI SDK 4.3.19: generateText, streamText, useChat, generateObject, and production hardening.",
      slug: "ai-integration",
      order: 15,
      phase: "D",
      status: "published",
      lessons: [
        {
          title: "AI SDK Basics — generateText and streamText",
          description:
            "Set up the Vercel AI SDK and make your first LLM calls with generateText and streamText.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Install AI SDK",
                body: "The Vercel AI SDK is how Reading Advantage integrates LLMs. It provides generateText, streamText, generateObject, and useChat.",
                code: "pnpm add ai@4.3.19 @ai-sdk/openai@1.3.24 @ai-sdk/react@1.2.12\n\n// src/lib/ai.ts\nimport { createOpenAI } from \"@ai-sdk/openai\";\nexport const openrouter = createOpenAI({\n  apiKey: process.env.OPENROUTER_API_KEY,\n  baseURL: \"https://openrouter.ai/api/v1\",\n});",
              },
              {
                heading: "generateText — Complete Response",
                body: "generateText waits for the full response. Use it for one-shot explanations, classification, and summaries.",
                code: "import { generateText } from \"ai\";\nimport { openrouter } from \"@/lib/ai\";\n\nconst { text } = await generateText({\n  model: openrouter(\"openrouter/free\"),\n  system: \"You are a programming tutor.\",\n  prompt: `Explain closures in simple terms.`,\n});\n\n// Use cases:\n// - One-shot explanations\n// - Classifying input\n// - Generating titles or summaries",
              },
              {
                heading: "streamText — Streaming Response",
                body: "streamText returns tokens as they arrive. Use it for chat interfaces where users see responses in real-time.",
                code: "import { streamText } from \"ai\";\n\nconst result = streamText({\n  model: openrouter(\"openrouter/free\"),\n  system: `You are a coding tutor. Default to Thai language.`,\n  prompt: message,\n  maxTokens: 2048,\n});\n\nreturn result.toDataStreamResponse();\n\n// Key difference:\n// generateText → returns complete text\n// streamText → returns a stream of tokens",
              },
            ],
          },
        },
        {
          title: "Building a Chat UI with useChat",
          description:
            "Use the useChat hook from @ai-sdk/react to build a full chat interface with message persistence.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "useChat Hook",
                body: "useChat handles the entire chat cycle: messages, streaming, submission, loading state, and errors.",
                code: "\"use client\";\nimport { useChat } from \"@ai-sdk/react\";\n\nexport function ChatTutor({ moduleId }: { moduleId?: string }) {\n  const { messages, input, handleInputChange, handleSubmit, isLoading } =\n    useChat({\n      api: \"/api/chat\",\n      body: { moduleId },\n    });\n\n  return (\n    <div>\n      {messages.map((msg) => (\n        <div key={msg.id}>\n          {msg.role}: {msg.content}\n        </div>\n      ))}\n      <form onSubmit={handleSubmit}>\n        <input\n          value={input}\n          onChange={handleInputChange}\n          placeholder=\"Ask a question...\"\n        />\n        <button type=\"submit\" disabled={isLoading}>\n          Send\n        </button>\n      </form>\n    </div>\n  );\n}",
              },
              {
                heading: "Chat Persistence",
                body: "Save messages to the database so the intern can resume conversations across sessions.",
                code: "// Domain function pattern\nexport async function saveMessage({ db, user, input }) {\n  assertCan(user, \"chat:use\", tenant);\n  const [message] = await db\n    .insert(chatMessages)\n    .values({\n      conversationId: input.conversationId,\n      role: input.role,\n      content: input.content,\n    })\n    .returning();\n  return message;\n}\n\nexport async function getConversationHistory({ db, user, input }) {\n  assertCan(user, \"chat:use\", tenant);\n  return db\n    .select()\n    .from(chatMessages)\n    .where(eq(chatMessages.conversationId, input.conversationId))\n    .orderBy(chatMessages.createdAt);\n}",
              },
            ],
          },
        },
        {
          title: "Structured Output with generateObject",
          description:
            "Return structured, Zod-validated data from LLMs with generateObject for quiz feedback and code review.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "generateObject with Zod",
                body: "generateObject returns a Zod-validated object instead of free-form text. Used for quiz feedback and exercise review.",
                code: "import { generateObject } from \"ai\";\nimport { z } from \"zod\";\n\nconst quizFeedbackSchema = z.object({\n  passed: z.boolean(),\n  explanation: z.string(),\n  relatedTopics: z.array(z.string()),\n});\n\nconst { object } = await generateObject({\n  model: openrouter(\"openrouter/free\"),\n  schema: quizFeedbackSchema,\n  prompt: `Student answered: ...`,\n});\n\n// object is typed as QuizFeedback — fully type-safe!\nconsole.log(object.passed);\nconsole.log(object.explanation);",
              },
              {
                heading: "Code Review Schema",
                body: "Use generateObject for structured code review with line-by-line feedback.",
                code: "const codeReviewSchema = z.object({\n  passed: z.boolean(),\n  score: z.number().min(0).max(100),\n  feedback: z.string(),\n  improvements: z.array(z.object({\n    line: z.number(),\n    suggestion: z.string(),\n  })),\n});\n\nconst { object } = await generateObject({\n  model: openrouter(\"openrouter/free\"),\n  schema: codeReviewSchema,\n  system: \"You are a code reviewer for a web dev bootcamp.\",\n  prompt: `Exercise: ${exerciseTitle}\\nStudent code: ...`,\n});",
              },
            ],
          },
        },
        {
          title: "Rate Limiting and Production Concerns",
          description:
            "Harden AI endpoints with rate limiting, authentication checks, input validation, and graceful fallbacks.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Per-User Rate Limiting",
                body: "LLM API calls cost money and can be abused. Implement per-user rate limiting with a sliding window.",
                code: "interface RateLimitEntry {\n  count: number;\n  windowStart: number;\n}\n\nconst RATE_LIMIT_WINDOW_MS = 60 * 1000;\nconst RATE_LIMIT_MAX_REQUESTS = 30;\n\nconst rateLimits = new Map<string, RateLimitEntry>();\n\nexport function checkRateLimit(userId: string) {\n  const now = Date.now();\n  const entry = rateLimits.get(userId);\n  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {\n    rateLimits.set(userId, { count: 1, windowStart: now });\n    return { allowed: true };\n  }\n  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {\n    return { allowed: false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000) };\n  }\n  entry.count++;\n  return { allowed: true };\n}",
              },
              {
                heading: "Production Chat Route",
                body: "A production-ready chat route checks auth, rate limits, validates input, and falls back gracefully.",
                code: "export async function POST(request: Request) {\n  try {\n    const user = await getAuthUser(request);\n    if (!user) return Response.json({ error: \"Authentication required\" }, { status: 401 });\n\n    const rateCheck = checkRateLimit(user.id);\n    if (!rateCheck.allowed) {\n      return Response.json({ error: \"Rate limit exceeded\" }, { status: 429 });\n    }\n\n    const body = await request.json();\n    const parsed = chatInputSchema.safeParse(body);\n    if (!parsed.success) {\n      return Response.json({ error: \"Invalid input\" }, { status: 400 });\n    }\n\n    if (!process.env.OPENROUTER_API_KEY) {\n      return Response.json({ response: \"[AI Tutor fallback] Configure OPENROUTER_API_KEY.\" });\n    }\n\n    const result = streamText({\n      model: openrouter(\"openrouter/free\"),\n      system: buildSystemPrompt(parsed.data.moduleId),\n      prompt: parsed.data.message,\n      maxTokens: 2048,\n    });\n    return result.toDataStreamResponse();\n  } catch (error) {\n    console.error(\"Chat API error:\", error);\n    return Response.json({ error: \"Failed to generate response\" }, { status: 500 });\n  }\n}",
              },
            ],
          },
        },
        {
          title: "AI Integration Exercise + Quiz",
          description:
            "Build a code review bot with streaming chat and structured output, and test your AI SDK knowledge.",
          order: 5,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the AI integration exercise by building a code review bot with chat and structured review output.",
          },
          exercises: [
            {
              title: "Build a Code Review Bot",
              instructions:
                "Fork the exercise repo and build a code review bot: create POST /api/chat that streams LLM responses using streamText, create POST /api/review that returns structured code review using generateObject, build a chat UI using useChat from @ai-sdk/react, add a system prompt that includes exercise context, add per-user rate limiting (20 requests per minute), add authentication check, add a fallback response when OPENROUTER_API_KEY is not configured, save chat messages to the database, and build a Review Code button that calls /api/review and displays structured feedback.",
              starterCode:
                "// TODO: Create /api/chat with streamText\n// TODO: Create /api/review with generateObject\n// TODO: Build chat UI with useChat\n// TODO: Add system prompt with context\n// TODO: Add rate limiting\n// TODO: Add auth check\n// TODO: Add fallback response\n// TODO: Save messages to DB\n// TODO: Build Review Code button",
              expectedOutput:
                "A code review bot with streaming chat, structured review output, rate limiting, and auth",
              hintsJson: [
                "Use streamText for chat and generateObject for structured review",
                "Use result.toDataStreamResponse() for streaming endpoints",
                "The generateObject schema should include passed, score, feedback, and suggestions",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is the difference between generateText and streamText?",
              optionsJson: [
                "There is no difference",
                "generateText waits for the full response; streamText sends tokens as they arrive",
                "generateText is faster",
                "streamText only works in Node.js",
              ],
              correctAnswer:
                "generateText waits for the full response; streamText sends tokens as they arrive",
              explanation:
                "generateText blocks until the entire response is ready. streamText returns a stream that emits tokens as the LLM generates them.",
              order: 1,
            },
            {
              question: "What does generateObject do differently from generateText?",
              optionsJson: [
                "It is faster",
                "Returns a Zod-validated structured object instead of free-form text",
                "It only works with OpenAI",
                "It does not require an API key",
              ],
              correctAnswer:
                "Returns a Zod-validated structured object instead of free-form text",
              explanation:
                "generateObject takes a Zod schema and returns a validated object. generateText returns plain text.",
              order: 2,
            },
            {
              question: "Why is rate limiting important for AI API endpoints?",
              optionsJson: [
                "It makes responses faster",
                "LLM calls cost money and can be abused",
                "It is required by law",
                "It improves accuracy",
              ],
              correctAnswer: "LLM calls cost money and can be abused",
              explanation:
                "LLM API calls cost money per token. Without rate limiting, a malicious or buggy client could generate excessive costs.",
              order: 3,
            },
            {
              question: "What does useChat handle automatically?",
              optionsJson: [
                "Only the input field",
                "Message state, streaming, form submission, loading state",
                "Database persistence",
                "Authentication",
              ],
              correctAnswer:
                "Message state, streaming, form submission, loading state",
              explanation:
                "useChat from @ai-sdk/react handles the entire chat UI lifecycle: message state, streaming responses, form submission, and loading indicators.",
              order: 4,
            },
            {
              question: "What should you do if the LLM API key is not configured?",
              optionsJson: [
                "Throw an error and crash",
                "Return a fallback response instead of crashing",
                "Retry indefinitely",
                "Redirect to the home page",
              ],
              correctAnswer: "Return a fallback response instead of crashing",
              explanation:
                "Production code should always have a fallback. If the API key is missing, return a helpful message instead of crashing.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 16: Monorepo & Package Management ─────────────
    {
      title: "Monorepo & Package Management",
      description:
        "Understand the Reading Advantage monorepo architecture: pnpm 8.15.8 workspaces, workspace:* dependencies, and Turborepo 2.9.8 pipeline and caching.",
      slug: "monorepo-packages",
      order: 16,
      phase: "D",
      status: "published",
      lessons: [
        {
          title: "pnpm Workspaces",
          description:
            "Understand how pnpm workspaces organize multiple packages in a single repository.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Workspace Configuration",
                body: "pnpm workspaces let you manage many packages in one repository. The pnpm-workspace.yaml file defines which directories contain packages.",
                code: "# pnpm-workspace.yaml\npackages:\n  - \"apps/*\"\n  - \"packages/*\"\n\n# Install all workspace dependencies\npnpm install\n\n# Install a dependency for a specific package\npnpm add zod --filter=@reading-advantage/domain\n\n# Run a script in a specific package\npnpm --filter @reading-advantage/db run build",
              },
              {
                heading: "workspace:* Dependencies",
                body: "When one package depends on another in the same monorepo, use workspace:*. This creates a symlink so changes are instantly available.",
                code: "// packages/api/package.json\n{\n  \"dependencies\": {\n    \"@reading-advantage/db\": \"workspace:*\",\n    \"@reading-advantage/auth\": \"workspace:*\",\n    \"@reading-advantage/domain\": \"workspace:*\",\n    \"@reading-advantage/types\": \"workspace:*\"\n  }\n}\n\n// workspace:* creates a symlink\n// Changes to packages/db are instantly available to packages/api",
              },
              {
                heading: "Dependency Order",
                body: "Packages must follow a strict dependency order to avoid circular dependencies.",
                code: "// Correct dependency order:\n// db → auth → types → domain → api / webhooks\n//                ↓\n//               ui (no backend deps)\n\n// ✅ db can import: nothing (only external packages)\n// ✅ auth can import: db\n// ✅ types can import: nothing (only Zod)\n// ✅ domain can import: db, auth, types\n// ✅ api can import: db, auth, domain, types\n\n// ❌ db importing from domain → circular!\n// ❌ domain importing from api → wrong direction!\n// ❌ ui importing from db → UI must not know about DB!",
              },
            ],
          },
        },
        {
          title: "Turborepo Pipeline",
          description:
            "Understand how Turborepo automates builds, tests, and linting across the monorepo with proper task ordering and caching.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "turbo.json Configuration",
                body: "Turborepo defines tasks and their dependencies. ^build means 'build all workspace dependencies first'.",
                code: "// turbo.json\n{\n  \"$schema\": \"https://turbo.build/schema.json\",\n  \"tasks\": {\n    \"build\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": [\"dist/**\", \".next/**\"]\n    },\n    \"test\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": []\n    },\n    \"lint\": {\n      \"dependsOn\": [\"^build\"],\n      \"outputs\": []\n    },\n    \"dev\": {\n      \"cache\": false,\n      \"persistent\": true\n    }\n  }\n}",
              },
              {
                heading: "Caching",
                body: "Turborepo caches task outputs. If nothing changed, it skips the task. This makes monorepo builds incredibly fast.",
                code: "# First run: builds everything\npnpm turbo run build\n\n# Second run: nothing changed → all cached\npnpm turbo run build\n\n# Change one file in packages/domain\npnpm turbo run build\n# → Rebuilds domain + api + codecamp-advantage\n# → db, auth, types, ui still cached",
              },
              {
                heading: "Running Tasks",
                body: "Common Turborepo commands for daily development.",
                code: "# Build everything in the correct order\npnpm turbo run build\n\n# Build a single package and its dependencies\npnpm turbo run build --filter=codecamp-advantage\n\n# Run tests for a specific package\npnpm turbo run test --filter=@reading-advantage/domain\n\n# Run lint for all packages\npnpm turbo run lint\n\n# Type check all packages\npnpm turbo run check-types",
              },
            ],
          },
        },
        {
          title: "Monorepo Exercise + Quiz",
          description:
            "Map the Reading Advantage monorepo and test your monorepo knowledge.",
          order: 3,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the monorepo exercise by mapping the Reading Advantage monorepo's dependency graph.",
          },
          exercises: [
            {
              title: "Map the Reading Advantage Monorepo",
              instructions:
                "Work directly in the real monorepo: read every package.json in packages/ and apps/, create docs/dependency-graph.md showing each package's name, purpose, and workspace dependencies, identify which packages import each other, answer questions about rebuild scope and dependency violations, run pnpm turbo run build and confirm it succeeds, and run pnpm turbo run build --filter=@reading-advantage/domain and explain what gets built.",
              starterCode:
                "// TODO: Read all package.json files\n// TODO: Create dependency-graph.md\n// TODO: Identify workspace dependencies\n// TODO: Answer rebuild scope questions\n// TODO: Run pnpm turbo run build\n// TODO: Run pnpm turbo run build --filter=@reading-advantage/domain",
              expectedOutput:
                "A complete dependency graph document and successful Turborepo builds",
              hintsJson: [
                "Use grep or cat to read package.json files quickly",
                "Look for workspace:* in dependencies to find internal imports",
                "Turborepo's --filter builds the package and everything it depends on",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What does workspace:* mean in a package.json?",
              optionsJson: [
                "A wildcard import",
                "A symlink to a local workspace package — changes are instantly available",
                "A Git submodule",
                "A remote package",
              ],
              correctAnswer:
                "A symlink to a local workspace package — changes are instantly available",
              explanation:
                "workspace:* tells pnpm to create a symlink to the local package. Changes are immediately available without publishing or reinstalling.",
              order: 1,
            },
            {
              question: "What is the dependency order of Reading Advantage packages?",
              optionsJson: [
                "api → domain → types → auth → db",
                "db → auth → types → domain → api/webhooks",
                "ui → db → auth → domain → api",
                "There is no order",
              ],
              correctAnswer: "db → auth → types → domain → api/webhooks",
              explanation:
                "The correct order is: db (no deps) → auth (needs db) → types (no deps) → domain (needs db, auth, types) → api/webhooks (needs db, auth, domain, types).",
              order: 2,
            },
            {
              question: "What does ^build mean in turbo.json?",
              optionsJson: [
                "Build the current package",
                "The 'build' task of all upstream workspace dependencies",
                "Build all packages",
                "Clean and rebuild",
              ],
              correctAnswer:
                "The 'build' task of all upstream workspace dependencies",
              explanation:
                "^build means 'run the build task of all workspace dependencies first'. This ensures packages are built in the correct order.",
              order: 3,
            },
            {
              question: "How does Turborepo know which tasks to cache?",
              optionsJson: [
                "It guesses",
                "Based on input file hashes — if inputs haven't changed, skip the task",
                "It always caches everything",
                "It never caches",
              ],
              correctAnswer:
                "Based on input file hashes — if inputs haven't changed, skip the task",
              explanation:
                "Turborepo hashes input files. If the hash matches a previous run and outputs exist, it skips the task and restores cached outputs.",
              order: 4,
            },
            {
              question: "Why can't packages/ui import from packages/db?",
              optionsJson: [
                "It is not allowed by pnpm",
                "UI is frontend-only; it must not depend on backend packages like the database",
                "The import path is too long",
                "It causes a TypeScript error",
              ],
              correctAnswer:
                "UI is frontend-only; it must not depend on backend packages like the database",
              explanation:
                "packages/ui contains React components only. It must not import backend packages like db, domain, or api to maintain clean architecture boundaries.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 17: Cloud & Dockerization ─────────────────────
    {
      title: "Cloud & Dockerization",
      description:
        "Containerize the Student Progress Tracker with Docker: images, containers, multi-stage builds, docker-compose, and cloud deployment overview.",
      slug: "cloud-docker",
      order: 17,
      phase: "D",
      status: "published",
      lessons: [
        {
          title: "Docker Basics",
          description:
            "Learn Docker concepts: images, containers, volumes, networks, and basic commands.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Docker Concepts",
                body: "Docker packages your app and all its dependencies into a container. The same container runs identically on every machine.",
                code: "| Concept | What it is | Analogy |\n|---------|-----------|---------|\n| Image | Blueprint for a container | Recipe |\n| Container | Running instance of an image | Baked cake |\n| Volume | Persistent storage | USB drive |\n| Network | Communication between containers | WiFi |\n| Dockerfile | Instructions to build an image | Recipe card |",
              },
              {
                heading: "Basic Docker Commands",
                body: "Essential Docker commands for daily use.",
                code: "# Pull and run a simple image\ndocker run hello-world\n\n# Run PostgreSQL\ndocker run -d \\\n  --name my-postgres \\\n  -e POSTGRES_PASSWORD=postgres \\\n  -p 5432:5432 \\\n  postgres:16-alpine\n\n# List running containers\ndocker ps\n\n# Stop and start\ndocker stop my-postgres\ndocker start my-postgres\n\n# View logs\ndocker logs my-postgres\n\n# Execute inside container\ndocker exec -it my-postgres psql -U postgres",
              },
              {
                heading: "Port Mapping and Volumes",
                body: "Map host ports to container ports and persist data across container restarts.",
                code: "# Port mapping: -p HOST:CONTAINER\ndocker run -p 5432:5432 postgres:16-alpine\n\n# Volume for persistence\ndocker run -d \\\n  --name my-postgres \\\n  -e POSTGRES_PASSWORD=postgres \\\n  -p 5432:5432 \\\n  -v pgdata:/var/lib/postgresql/data \\\n  postgres:16-alpine\n\n# Data survives restart!\ndocker stop my-postgres\ndocker start my-postgres",
              },
            ],
          },
        },
        {
          title: "Dockerfile for Next.js",
          description:
            "Write a production Dockerfile with multi-stage build for the Student Progress Tracker.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Multi-Stage Dockerfile",
                body: "A multi-stage build creates smaller final images by separating build tools from runtime. We use Node.js 20 with pnpm 8.15.8, matching the monorepo's tech stack.",
                code: "# Stage 1: Install dependencies\nFROM node:20-alpine AS deps\nRUN corepack enable && corepack prepare pnpm@8.15.8 --activate\nWORKDIR /app\nCOPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./\nCOPY packages/*/package.json ./packages/*/\nCOPY apps/*/package.json ./apps/*/\nRUN pnpm install --frozen-lockfile\n\n# Stage 2: Build\nFROM node:20-alpine AS builder\nRUN corepack enable && corepack prepare pnpm@8.15.8 --activate\nWORKDIR /app\nCOPY --from=deps /app/node_modules ./node_modules\nCOPY . .\nENV NEXT_TELEMETRY_DISABLED=1\nENV NODE_ENV=production\nRUN pnpm turbo run build --filter=tracker\n\n# Stage 3: Production\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nRUN addgroup --system --gid 1001 nodejs && \\\n    adduser --system --uid 1001 nextjs\nCOPY --from=builder /app/apps/tracker/.next/standalone ./\nCOPY --from=builder /app/apps/tracker/.next/static ./apps/tracker/.next/static\nCOPY --from=builder /app/apps/tracker/public ./apps/tracker/public\nUSER nextjs\nEXPOSE 3000\nCMD [\"node\", \"apps/tracker/server.js\"]",
              },
              {
                heading: ".dockerignore",
                body: "Prevent unnecessary files from being copied into the Docker image.",
                code: "# .dockerignore\nnode_modules\n.next\n.git\n*.md\n.env*.local\ndist\ncoverage",
              },
            ],
          },
        },
        {
          title: "docker-compose for Full Stack",
          description:
            "Define the entire stack in one docker-compose.yml with PostgreSQL and the Next.js app.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "docker-compose.yml",
                body: "docker-compose defines all services, their dependencies, volumes, and environment variables.",
                code: "version: \"3.8\"\n\nservices:\n  db:\n    image: postgres:16-alpine\n    restart: unless-stopped\n    environment:\n      POSTGRES_USER: postgres\n      POSTGRES_PASSWORD: postgres\n      POSTGRES_DB: tracker\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - pgdata:/var/lib/postgresql/data\n    healthcheck:\n      test: [\"CMD-SHELL\", \"pg_isready -U postgres\"]\n      interval: 5s\n      timeout: 5s\n      retries: 5\n\n  app:\n    build:\n      context: .\n      dockerfile: Dockerfile\n    restart: unless-stopped\n    ports:\n      - \"3000:3000\"\n    environment:\n      DATABASE_URL: postgres://postgres:postgres@db:5432/tracker\n    depends_on:\n      db:\n        condition: service_healthy\n\nvolumes:\n  pgdata:",
              },
              {
                heading: "Running the Stack",
                body: "Common docker-compose commands for managing the full stack.",
                code: "# Start everything\ndocker compose up -d\n\n# View logs\ndocker compose logs -f\n\n# View app logs only\ndocker compose logs -f app\n\n# Stop everything\ndocker compose down\n\n# Stop and remove volumes (fresh start)\ndocker compose down -v\n\n# Rebuild after code changes\ndocker compose up -d --build",
              },
            ],
          },
        },
        {
          title: "Cloud & Dockerization Exercise + Quiz",
          description:
            "Containerize the Student Progress Tracker and test your Docker knowledge.",
          order: 4,
          type: "quiz",
          contentJson: {
            instructions:
              "Complete the Docker exercise by containerizing the Student Progress Tracker.",
          },
          exercises: [
            {
              title: "Containerize the Student Progress Tracker",
              instructions:
                "No exercise repo — containerize your actual tracker project: write a production Dockerfile with multi-stage build, write a .dockerignore file, write a docker-compose.yml with PostgreSQL 16 Alpine service with healthcheck, app service that depends on db being healthy, named volume for database persistence, environment variable configuration, add a seed service that runs migrations and seeds on first start, test docker compose up -d and confirm the app works at localhost:3000, test docker compose down then docker compose up -d and confirm data persists, and document the deployment process in a docs/deployment.md file.",
              starterCode:
                "// TODO: Write Dockerfile (multi-stage)\n// TODO: Write .dockerignore\n// TODO: Write docker-compose.yml\n// TODO: Add seed service\n// TODO: Test docker compose up -d\n// TODO: Test data persistence\n// TODO: Write docs/deployment.md",
              expectedOutput:
                "A containerized tracker app running in Docker with persistent database and deployment documentation",
              hintsJson: [
                "Multi-stage build: deps → builder → runner",
                "Use depends_on with condition: service_healthy to wait for the database",
                "Named volumes persist data across container restarts",
              ],
              order: 1,
            },
          ],
          questions: [
            {
              question: "What is the difference between a Docker image and a container?",
              optionsJson: [
                "They are the same thing",
                "Image = blueprint/template; Container = running instance",
                "Image is larger than a container",
                "Container is permanent; image is temporary",
              ],
              correctAnswer: "Image = blueprint/template; Container = running instance",
              explanation:
                "An image is a static blueprint. A container is a running instance of that image.",
              order: 1,
            },
            {
              question: "Why use a multi-stage Docker build?",
              optionsJson: [
                "It is required",
                "Smaller final image — only includes runtime, not build tools",
                "It is faster to build",
                "It uses more memory",
              ],
              correctAnswer:
                "Smaller final image — only includes runtime, not build tools",
              explanation:
                "Multi-stage builds separate build dependencies from runtime. The final image only contains what's needed to run the app.",
              order: 2,
            },
            {
              question: "What does depends_on: condition: service_healthy do?",
              optionsJson: [
                "Nothing",
                "Waits for the database healthcheck to pass before starting the app",
                "Restarts the app if it crashes",
                "Runs the app before the database",
              ],
              correctAnswer:
                "Waits for the database healthcheck to pass before starting the app",
              explanation:
                "service_healthy ensures the app container waits until the database passes its healthcheck before starting.",
              order: 3,
            },
            {
              question:
                "What is a Docker volume and why do you need one for PostgreSQL?",
              optionsJson: [
                "A volume is a backup file",
                "Persistent storage that survives container restarts — without it, data is lost when the container stops",
                "A volume is a network share",
                "Volumes are optional for databases",
              ],
              correctAnswer:
                "Persistent storage that survives container restarts — without it, data is lost when the container stops",
              explanation:
                "Containers are ephemeral — when they stop, all data inside is lost. Volumes mount persistent storage that survives restarts.",
              order: 4,
            },
            {
              question: "Why should .env files with real secrets not be committed?",
              optionsJson: [
                "They are too large",
                "Secrets in git are visible to anyone with repo access — use Secret Manager in production",
                "Git ignores them automatically",
                "They cause merge conflicts",
              ],
              correctAnswer:
                "Secrets in git are visible to anyone with repo access — use Secret Manager in production",
              explanation:
                "Committing secrets to git exposes them to anyone with repository access. Use environment variables or a secret manager in production.",
              order: 5,
            },
          ],
        },
      ],
    },

    // ─── Module 18: Real-World Practice ───────────────────────
    {
      title: "Real-World Practice",
      description:
        "The capstone module: work through pre-filed GitHub Issues on the tracker repo, practicing the full feature delivery lifecycle from issue to merged PR.",
      slug: "real-world-practice",
      order: 18,
      phase: "D",
      status: "published",
      lessons: [
        {
          title: "Reading Issues and Planning Implementation",
          description:
            "Learn the feature delivery lifecycle and how to read and plan from GitHub Issues.",
          order: 1,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "The Feature Delivery Lifecycle",
                body: "Every change at Reading Advantage follows this lifecycle. It starts with an Issue and ends with a merged PR.",
                code: "1. Read the Issue\n   ↓\n2. Understand the acceptance criteria\n   ↓\n3. Create a feature branch: feat/issue-1-description\n   ↓\n4. Implement the change (TDD: write tests first!)\n   ↓\n5. Run lint, typecheck, and tests locally\n   ↓\n6. Commit with conventional commit message\n   ↓\n7. Push the branch\n   ↓\n8. Open a PR referencing the Issue: \"Closes #1\"\n   ↓\n9. Address review feedback\n   ↓\n10. Merge when approved",
              },
              {
                heading: "How to Read an Issue",
                body: "A good Issue has a description, acceptance criteria, and technical notes. Read all three before writing code.",
                code: "## Description\nWhat needs to change and why.\n\n## Acceptance Criteria\n- [ ] A checklist of specific requirements\n- [ ] Each item must be true for the Issue to be complete\n\n## Technical Notes\n- Where to make changes\n- Patterns to follow\n- Edge cases to handle",
              },
              {
                heading: "Planning the Implementation",
                body: "Before writing code, plan the changes: identify new domain functions, router changes, UI changes, and tests needed.",
                code: "Example Issue: Add module completion percentage\n\n1. Domain function: getModuleCompletionPercentage\n2. Router change: add completionPercentage to dashboard query\n3. UI change: show percentage on module cards\n4. Tests: unit tests for domain function\n\nImplementation order: test → domain → router → UI",
              },
            ],
          },
        },
        {
          title: "Opening PRs and Code Review",
          description:
            "Write good PR descriptions, open PRs, and practice code review etiquette.",
          order: 2,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Write a Good PR Description",
                body: "A good PR description makes review fast and painless. Include summary, changes, testing steps, and screenshots.",
                code: "## Summary\nAdds module completion percentage to the dashboard.\n\nCloses #1\n\n## Changes\n- Added getModuleCompletionPercentage domain function\n- Updated dashboard tRPC query\n- Updated ModuleCard component\n\n## Testing\n- [x] Unit tests pass\n- [x] Lint passes\n- [x] Manually tested on dashboard\n\n## Screenshots\nBefore: Module card shows \"3/6 lessons\"\nAfter: Module card shows \"3/6 lessons (50%)\"",
              },
              {
                heading: "Code Review Etiquette",
                body: "When receiving review feedback: read all comments first, address every comment, explain respectfully if you disagree, push fixes as new commits, and re-request review.",
                code: "When reviewing someone else's code:\n1. Start with something positive\n2. Be specific: \"Line 42: This could be simplified to...\"\n3. Distinguish severity:\n   🔴 Blocking — must fix (bugs, security, missing tests)\n   🟡 Suggestion — nice to have\n   🟢 Nit — pure preference\n4. Don't block on nits",
              },
            ],
          },
        },
        {
          title: "Continued Practice — Medium Difficulty Issues",
          description:
            "Work independently on medium-difficulty Issues using the full workflow.",
          order: 3,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Independent Work",
                body: "Work on Issues independently, following the full workflow. The instructor is available for questions but does not provide step-by-step guidance.",
                code: "Tips for medium Issues:\n- Break the Issue into smaller sub-tasks\n- Commit after each sub-task (atomic commits)\n- If stuck, write a comment on the Issue\n- Use assertCan() for any new domain functions\n- All new code needs tests\n\nExample Issues:\n- #3: Implement lesson prerequisite checks\n- #5: Add email validation to login form",
              },
            ],
          },
        },
        {
          title: "Final Practice and Retrospective",
          description:
            "Finish remaining Issues and reflect on the entire 85-lesson journey.",
          order: 4,
          type: "theory",
          contentJson: {
            sections: [
              {
                heading: "Course Retrospective",
                body: "Reflect on the entire bootcamp journey. What was challenging? What took the longest to click? How confident do you feel about joining the Reading Advantage codebase?",
                code: "By the end of this bootcamp, you can:\n✅ Set up a professional dev environment (VS Code, Node.js 20, pnpm 8.15.8)\n✅ Use Git/GitHub with Conventional Commits\n✅ Build responsive web pages with HTML/CSS\n✅ Write interactive apps with JavaScript/TypeScript\n✅ Test your code with Vitest 4.1.5\n✅ Build UIs with React 19.2.5\n✅ Fetch data from APIs\n✅ Build full-stack apps with Next.js 16.0.0\n✅ Design schemas with Drizzle ORM 0.44.7\n✅ Build type-safe APIs with tRPC 11.17.0\n✅ Implement auth and RBAC\n✅ Add i18n with next-intl 4.11.0\n✅ Integrate AI with Vercel AI SDK 4.3.19\n✅ Understand monorepo architecture\n✅ Containerize apps with Docker\n✅ Work with GitHub Issues, PRs, and code review",
              },
              {
                heading: "What's Next",
                body: "You are ready to build real software. Join the Reading Advantage codebase — the architecture is familiar now. The AI chat tutor is always available for questions.",
                code: "🎉 Congratulations! You've completed the Full-Stack Web Development Intern Bootcamp.\n\n18 units. 85 class periods. 4 portfolio projects.\n1 complete full-stack application from database to deployment.\n\nYou're ready to build real software.",
              },
            ],
          },
        },
      ],
    },
  ];

  return { modules, exerciseRepos: getExerciseRepos(modules) };
}
