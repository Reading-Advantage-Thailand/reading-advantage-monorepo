# Unit 01 Class Period Plans: Dev Environment Setup

---

## Period 1: Terminal, Node.js, pnpm

**Duration:** ~60 minutes

### Opening (5 min)

- Introduce the course structure: 85 periods, 18 units, 4 phases, 4 portfolio projects
- Explain why dev environment matters: every Reading Advantage developer uses the same toolchain
- Today's goal: terminal proficiency + Node.js + pnpm installed

### Activity: Terminal Basics (20 min)

The intern follows along in their terminal:

```bash
# Navigation
pwd                          # Where am I?
ls                           # What's here?
cd Desktop                   # Go to Desktop
cd ..                        # Go back up
mkdir codecamp               # Create workspace folder
cd codecamp

# File operations
echo "Hello, codecamp!" > hello.txt
cat hello.txt
mkdir projects
mv hello.txt projects/
ls projects/
rm projects/hello.txt
rmdir projects
```

**Checkpoint:** Intern can navigate, create/delete files and folders without hesitation.

### Activity: Install Node.js 20 (15 min)

1. Download Node.js 20 LTS from nodejs.org (or use `nvm install 20`)
2. Verify:
   ```bash
   node --version   # v20.x.x
   npm --version    # 10.x.x
   ```
3. Run a quick script:
   ```bash
   node -e "console.log('Node.js is working!')"
   ```

### Activity: Install pnpm 8.15.8 (15 min)

1. Install via corepack (bundled with Node.js 20):
   ```bash
   corepack enable
   corepack prepare pnpm@8.15.8 --activate
   ```
2. Verify:
   ```bash
   pnpm --version   # 8.15.8
   ```
3. Brief explanation: why pnpm over npm?
   - Faster installs (content-addressable store)
   - Strict dependency isolation (no phantom deps)
   - Used by the entire Reading Advantage monorepo

### Closing (5 min)

- Recap: terminal, Node.js, pnpm
- Preview: Period 2 covers VS Code, extensions, and cloning the monorepo

---

## Period 2: VS Code, Extensions, Monorepo Setup

**Duration:** ~60 minutes

### Opening (5 min)

- Last period: terminal, Node.js, pnpm ✓
- Today: VS Code, extensions, and actually running the codecamp app

### Activity: Install and Configure VS Code (15 min)

1. Download and install VS Code
2. Open the integrated terminal: `Ctrl+\`` (or `Cmd+\`` on Mac)
3. Set the default terminal to bash/zsh
4. Enable auto-save: File → Auto Save
5. Configure default formatter: Prettier

### Activity: Install Essential Extensions (15 min)

Install these extensions from the VS Code marketplace:

| Extension | Purpose |
|-----------|---------|
| ESLint | Squiggly lines for lint errors |
| Prettier — Code formatter | Format on save |
| GitLens | See who changed what, when |
| Tailwind CSS IntelliSense | Autocomplete Tailwind classes |
| TypeScript Error Translator | Readable TS error messages |

Configure format-on-save in VS Code settings:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Activity: Clone and Run the Monorepo (20 min)

1. Clone the monorepo:
   ```bash
   cd ~/codecamp
   git clone <monorepo-url> reading-advantage-monorepo
   cd reading-advantage-monorepo
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the database:
   ```bash
   pnpm db:start
   ```
4. Start the dev server:
   ```bash
   pnpm dev
   ```
5. Open `http://localhost:3000` (or whichever port codecamp-advantage uses) and confirm the app loads

**Checkpoint:** Intern sees the codecamp-advantage dashboard in their browser.

### Quiz (5 min)

5 questions covering:

1. What command shows your current directory? (`pwd`)
2. What version of Node.js does this monorepo use? (20)
3. Why does this monorepo use pnpm instead of npm? (faster, strict deps)
4. What does `pnpm install` do? (installs all workspace dependencies)
5. What VS Code extension provides format-on-save? (Prettier)

### Closing

- Intern's dev environment is fully set up
- Next unit: Git & GitHub Fundamentals
