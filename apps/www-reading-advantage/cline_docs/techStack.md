# Technology Stack Documentation

## Core Framework

- **Next.js 15**
  - Using App Router architecture
  - Turbopack for development
  - TypeScript support
  - Server-side rendering capabilities

## Frontend Technologies

### UI Framework

- **React 19 (Release Candidate)**
  - Latest features and improvements
  - Server Components support

### Styling

- **Tailwind CSS 3.4**
  - Utility-first CSS framework
  - Custom animations via tailwindcss-animate
  - Class merging with tailwind-merge
  - @tailwindcss/typography for markdown content styling
  - tailwindcss-animate for animations
- **shadcn/ui Components**
  - Built on Radix UI primitives
  - Customizable and accessible components

### Animation

- **Framer Motion**
  - Page transitions
  - Component animations
  - Scroll-based animations

## Content Processing

- MDX for enhanced markdown support
- remark-gfm for GitHub Flavored Markdown
- rehype-slug and rehype-autolink-headings for heading anchors
- gray-matter for frontmatter parsing

## State Management

- React Context API

## Authentication

- Firebase Authentication

## Development Tools

### TypeScript & Type Safety

- **TypeScript 5**
  - Strong type checking
  - Enhanced developer experience
  - Type definitions for all major dependencies

### Code Quality

- **ESLint**
  - Code quality enforcement
  - Next.js specific rules
  - TypeScript integration

### UI Components

- **Radix UI Primitives**
  - @radix-ui/react-dialog
  - @radix-ui/react-select
  - @radix-ui/react-slot
  - @radix-ui/react-icons

### Utility Libraries

- **Class Management**
  - clsx for conditional class names
  - class-variance-authority for component variants
- **Icons**
  - lucide-react for modern icon set

## Build & Deployment

### Build System

- **Next.js Build System**
  - Optimized production builds
  - Asset optimization
  - Automatic code splitting

### Development Workflow

- **NPM Scripts**
  - `dev`: Development server with Turbopack
  - `build`: Production build
  - `start`: Production server
  - `lint`: Code linting

## Architecture Decisions

### 1. App Router Architecture

- Chosen for better server-side rendering capabilities
- Improved routing and layouts system
- Better support for React Server Components

### 2. Component Architecture

- Modular component design
- Separation of concerns between UI and logic
- Reusable component patterns with shadcn/ui

### 3. Content Strategy

- MDX for blog content
  - Allows React components in markdown
  - Enhanced content capabilities
  - Flexible content processing pipeline

### 4. Authentication Strategy

- Firebase Authentication
  - Scalable user management
  - Multiple auth providers support
  - Secure session handling

### 5. Styling Strategy

- Utility-first with Tailwind CSS
- Component-level styles when needed
- Design system implementation through shadcn/ui

## Future Considerations

### 1. Internationalization

- Planning for next-intl integration
- Multi-language content management
- RTL support preparation

### 2. Performance Optimization

- Image optimization strategies
- Code splitting improvements
- Caching strategies

### 3. Testing Infrastructure

- Component testing setup
- E2E testing implementation
- Performance testing tools

This document will be updated as new technologies are added or architectural decisions are made.
