# Science Advantage Tech Stack

## Core Technologies
- **Programming Language:** TypeScript (v5.8+) for end-to-end type safety.
- **Frontend Framework:** Next.js (v16.0) with App Router, React 19, and server-side rendering.
- **Styling:** Tailwind CSS (v4) for utility-first styling and Radix UI primitives for accessible components.
- **State Management:** React Hooks and Context API for local state; Next.js Server Actions for data mutations.

## Database & Data Management
- **Primary Database:** PostgreSQL (v16) for relational data storage.
- **ORM:** Prisma (v6.17) for schema management and type-safe database access.
- **Validation:** Zod for runtime schema validation, with `prisma-zod-generator` automatically creating schemas from the Prisma models.
- **Caching:** Redis (planned/configured) for session management and performance optimization.

## AI & Intelligence
- **AI Integration:** Vercel AI SDK (\`ai\` package) with support for Google (\`@ai-sdk/google\`) and OpenAI (\`@ai-sdk/openai\`) models.
- **Structured Data:** Automated generation of structured content using Zod schemas derived from Prisma models to ensure LLM output consistency.

## Infrastructure & DevOps
- **Containerization:** Docker and Docker Compose for local development environments (PostgreSQL).
- **Authentication:** NextAuth.js (Auth.js) with Google OAuth, integrating with the broader Advantage SSO ecosystem.
- **CI/CD:** GitHub Actions for automated linting, testing, and deployment.
- **Version Control:** Git, following a spec-first and issue-based workflow.

## Testing & Quality Assurance
- **Unit & Integration Testing:** Vitest for fast, reliable test execution.
- **End-to-End Testing:** Playwright/Cypress (configured/planned).
- **Linting & Formatting:** ESLint and Prettier for maintaining code quality and consistency.
