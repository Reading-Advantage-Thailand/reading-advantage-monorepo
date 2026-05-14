# Unit 02 Class Period Plans: Git & GitHub Fundamentals

---

## Period 1: Git Basics — init, add, commit

**Duration:** ~60 minutes

### Opening (5 min)

- Why version control? "Undo for code" + collaboration + history
- Git ≠ GitHub: Git is the tool, GitHub is the hosting service
- Today: local Git workflow (init → add → commit)

### Activity: Create Your Portfolio Repo (20 min)

1. Create the project folder:
   ```bash
   mkdir personal-portfolio
   cd personal-portfolio
   git init
   ```
2. Create a minimal `index.html`:
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>My Portfolio</title>
   </head>
   <body>
     <h1>Hello, I'm [Your Name]</h1>
     <p>Welcome to my portfolio.</p>
   </body>
   </html>
   ```
3. Stage and commit:
   ```bash
   git add index.html
   git status              # See what's staged
   git commit -m "feat: add initial portfolio page"
   ```

### Activity: The Git Cycle (20 min)

Practice the cycle by making 3 more changes:

1. Change the `<h1>` to include your Thai nickname → `git add index.html && git commit -m "feat: add Thai nickname to header"`
2. Add a `<footer>` with your school name → `git add index.html && git commit -m "feat: add footer with school name"`
3. Add a `.gitignore` file → `git add .gitignore && git commit -m "chore: add .gitignore"`

Key commands to internalize:

| Command | What it does |
|---------|-------------|
| `git status` | Show changed/staged/untracked files |
| `git add <file>` | Stage changes for commit |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Commit staged changes with a message |
| `git log --oneline` | View commit history |

### Activity: Conventional Commits (10 min)

Explain the format:
- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, config
- `docs:` — documentation
- `refactor:` — code restructure, no behavior change

Review the intern's 4 commits — do they follow the convention?

### Closing (5 min)

- Recap: init → add → commit → log
- Preview: Period 2 covers GitHub (remote repos, push, pull)

---

## Period 2: GitHub — Remote Repos, Push, Pull

**Duration:** ~60 minutes

### Opening (5 min)

- Last period: local Git ✓
- Today: connect to GitHub, push your portfolio, pull changes

### Activity: Create a GitHub Repository (10 min)

1. Go to github.com → New Repository
2. Name: `personal-portfolio`
3. Public, no README (we have local files)
4. Follow the "push existing repository" instructions:
   ```bash
   git remote add origin https://github.com/<username>/personal-portfolio.git
   git branch -M main
   git push -u origin main
   ```

### Activity: Push and Pull Workflow (20 min)

1. Make a local change, commit, push:
   ```bash
   # Add a section to index.html
   git add index.html
   git commit -m "feat: add about section"
   git push
   ```
2. Make a change on GitHub (edit `index.html` via the web editor)
3. Pull that change locally:
   ```bash
   git pull
   ```

### Activity: Understanding Remotes (15 min)

```bash
git remote -v              # Show remote URLs
git remote -h              # Help
git fetch                  # Download without merging
git pull                   # Fetch + merge
git push                   # Upload commits
```

Explain:
- `origin` is just a name (convention) for the remote URL
- `main` is the default branch name
- `-u` sets the upstream tracking branch (only needed once)

### Activity: GitHub Issues (10 min)

1. Go to your `personal-portfolio` repo → Issues → New Issue
2. Title: "Add contact information"
3. Body: "The portfolio needs a way for visitors to contact me. Add an email link."
4. Assign yourself
5. This is how Reading Advantage tracks work — every change starts with an Issue

### Closing

- Recap: remote add, push, pull, Issues
- Preview: Period 3 covers branching and forking

---

## Period 3: Branching, Forking, Pull Requests

**Duration:** ~60 minutes

### Opening (5 min)

- Branches let you work on features in isolation
- Forks are your own copy of someone else's repo
- PRs are how you propose changes — core to the Reading Advantage workflow

### Activity: Branching (20 min)

1. Create and switch to a feature branch:
   ```bash
   git switch -c feat/add-skills-section
   ```
2. Add a skills section to `index.html`
3. Commit: `git commit -m "feat: add skills section"`
4. Switch back to main:
   ```bash
   git switch main
   ```
5. Merge the branch:
   ```bash
   git merge feat/add-skills-section
   ```
6. Delete the branch:
   ```bash
   git branch -d feat/add-skills-section
   ```

### Activity: Forking and Pull Requests (25 min)

1. The instructor has a practice repo: `reading-advantage/codecamp-practice`
2. Fork it on GitHub (click "Fork" button)
3. Clone your fork:
   ```bash
   git clone https://github.com/<username>/codecamp-practice.git
   cd codecamp-practice
   ```
4. Create a branch:
   ```bash
   git switch -c feat/add-my-name
   ```
5. Edit `attendees.md` — add your name
6. Commit and push:
   ```bash
   git add attendees.md
   git commit -m "feat: add my name to attendees"
   git push -u origin feat/add-my-name
   ```
7. Open a Pull Request on GitHub (from your fork to the original repo)
8. Write a PR description following the template

### Activity: Simple Merge Conflict (10 min)

1. The instructor merges some PRs (creating conflicts)
2. Intern pulls from upstream:
   ```bash
   git remote add upstream https://github.com/reading-advantage/codecamp-practice.git
   git fetch upstream
   git merge upstream/main
   ```
3. Resolve the conflict in `attendees.md` manually
4. Commit the resolution:
   ```bash
   git add attendees.md
   git commit -m "fix: resolve merge conflict in attendees"
   git push
   ```

### Closing

- Recap: branch, fork, PR, merge conflict
- Preview: Period 4 wraps up Git with collaboration patterns and the quiz

---

## Period 4: Collaboration Patterns, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Review: branching, forking, PRs ✓
- Today: real collaboration patterns + quiz

### Activity: The Feature Branch Workflow (20 min)

Walk through the complete workflow interns will use throughout codecamp:

1. Pick an Issue from GitHub
2. Create a branch named after the issue: `feat/issue-3-contact-info`
3. Implement the change
4. Commit with a conventional commit message
5. Push the branch
6. Open a PR referencing the Issue: "Closes #3"
7. Address any review feedback
8. Merge

This is the **exact workflow** used in Reading Advantage. Every code change follows this path.

### Activity: Code Review Etiquette (15 min)

**As a PR author:**
- Write a clear description (What + Why)
- Keep PRs small and focused
- Respond to every comment
- Push fixes as new commits (don't force-push during review)

**As a reviewer:**
- Be kind and constructive
- Ask questions, don't command
- Distinguish blocking issues from suggestions ("nit:", "suggestion:", "blocking:")
- Approve when ready

### Activity: Git Commands Cheat Sheet (10 min)

Build a personal cheat sheet. Key commands by category:

**Daily:**
- `git status`, `git add`, `git commit`, `git push`, `git pull`

**Branching:**
- `git switch -c <name>`, `git switch <name>`, `git merge <branch>`, `git branch -d <name>`

**Forking:**
- `git remote add upstream <url>`, `git fetch upstream`, `git merge upstream/main`

**Recovery:**
- `git stash`, `git stash pop`, `git reset HEAD <file>` (unstage), `git checkout -- <file>` (discard changes)

### Quiz (10 min)

5 questions covering:

1. What is the difference between `git fetch` and `git pull`? (fetch downloads, pull downloads + merges)
2. What branch naming convention does Reading Advantage use? (type/description, e.g., `feat/add-contact`)
3. How do you propose changes to a repo you don't own? (fork → branch → PR)
4. What does "Closes #3" in a PR description do? (auto-closes Issue #3 on merge)
5. When should you use `git stash`? (temporarily save uncommitted work to switch branches)

### Closing

- Git fundamentals complete
- Next unit: HTML & CSS Crash Course — building the portfolio site
