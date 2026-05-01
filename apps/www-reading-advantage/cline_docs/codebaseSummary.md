# Codebase Summary

## Project Structure Overview

### Core Architecture

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── config/             # Configuration files
├── contexts/           # React contexts
├── lib/                # Utility functions and setup
├── messages/           # i18n translation files
└── types/              # TypeScript type definitions
```

## Key Components and Their Interactions

### Layout Components

- **RootLayout** (`src/app/layout.tsx`)
  - Main application shell
  - Handles global styling and metadata
  - Wraps application in AuthProvider
  - Implements page transitions
  - Contains header and footer structure

### Authentication System

- **AuthContext** (`src/contexts/auth-context.tsx`)
  - Manages user authentication state
  - Provides authentication methods:
    - Email/Password sign in
    - Google sign in
    - Sign out functionality
  - Handles auth state persistence
  - Provides loading states

### Navigation System

- **Navigation Configuration** (`src/config/navigation.ts`)
  - Centralized navigation structure
  - Product routes and metadata
  - Main site navigation links
  - Type-safe navigation using TypeScript

### Product Pages

- Individual product pages under `src/app/products/`
  - Reading Advantage
  - Math Advantage
  - Science Advantage
  - STEM Advantage
  - Zhongwen Advantage
  - Storytime Advantage
  - CodeCamp Advantage
  - Tutor Advantage

### Blog System

- Enhanced markdown processing pipeline:
  - GitHub Flavored Markdown (GFM) support via remark-gfm
  - Automatic heading anchors with rehype-slug
  - Clickable heading links with rehype-autolink-headings
  - Proper rendering of lists, tables, and code blocks
- Styled using @tailwindcss/typography plugin
- Frontmatter parsing with gray-matter
- Dynamic routing for blog posts
- Responsive image handling
- Reading time calculation
- Category and tag system

## Data Flow

### Authentication Flow

1. User authentication state managed by Firebase
2. AuthContext provides global auth state
3. Protected routes check auth status
4. Auth state persists across sessions

### Navigation Flow

1. Navigation configuration defines available routes
2. Dynamic product links generated from configuration
3. Type-safe navigation using TypeScript interfaces
4. Header component consumes navigation config

### Content Rendering Flow

1. Pages built using Next.js App Router
2. Server-side rendering for optimal performance
3. Client-side transitions with Framer Motion
4. MDX content processing for blog posts

## External Dependencies

### Firebase Integration

- Authentication services
- User management
- Security rules implementation

### Content Management

- Enhanced markdown processing pipeline:
  - unified/remark/rehype for markdown transformation
  - remark-gfm for GitHub Flavored Markdown
  - rehype-slug and rehype-autolink-headings for heading enhancement
  - @tailwindcss/typography for content styling
- Syntax highlighting
- Auto-linking headers

## Recent Significant Changes

### Authentication System

- [x] Implemented Firebase authentication
- [x] Added Google sign-in support
- [x] Created protected routes

### UI/UX Improvements

- [x] Added page transitions
- [x] Implemented responsive design
- [x] Enhanced navigation system
- [x] Updated product pages

### Content Management

- [x] Set up MDX blog system
- [x] Implemented basic blog infrastructure
- [x] Enhanced markdown rendering with GFM support
- [x] Added proper heading hierarchy and anchor links
- [x] Improved typography with Tailwind plugin
- [ ] Advanced blog features in progress

## Development Workflow

### Component Development

1. Components created in `src/components/`
2. Styled using Tailwind CSS
3. TypeScript for type safety
4. Reusable UI components from shadcn/ui

### Page Creation

1. Pages created in `src/app/` directory
2. Layout components for consistent structure
3. Server and client components separation
4. SEO optimization through metadata

### State Management

1. React Context for global state
2. Component-level state when appropriate
3. Server state management with Next.js

## User Feedback Integration

### Current Focus Areas

- Authentication system usability
- Page transition smoothness
- Blog system functionality
- Product page content

### Pending Improvements

- Enhanced mobile navigation
- Dark mode implementation
- Internationalization
- Performance optimizations

## Performance Considerations

### Current Optimizations

- Server-side rendering
- Image optimization
- Code splitting
- Font optimization

### Monitoring Areas

- Page load times
- Client-side transitions
- Authentication performance
- API response times

This document will be updated as the codebase evolves and new features are implemented.
