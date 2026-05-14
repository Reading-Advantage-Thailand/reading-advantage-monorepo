# Unit 17 Overview: Cloud & Dockerization

**Phase:** D (Production)
**Periods:** 4
**Portfolio Project:** Student Progress Tracker (containerized)

## Learning Objectives

By the end of this unit, the intern can:

1. Write a Dockerfile for a Next.js application
2. Write a docker-compose.yml for multi-service apps (Next.js + PostgreSQL)
3. Build and run Docker containers locally
4. Understand Docker concepts (images, containers, volumes, networks)
5. Understand the basics of deploying to Google Cloud

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Docker | Latest | Containerization |
| Docker Compose | Latest | Multi-container orchestration |
| PostgreSQL | 16 (Alpine) | Database (already familiar) |

## Portfolio Connection

The intern containerizes their Student Progress Tracker so it can run anywhere:

- Dockerfile for the Next.js app
- docker-compose.yml for the full stack (app + database)
- Environment variable management
- Production-ready configuration

## Key Concepts

- **Image**: A read-only template with instructions for creating a container
- **Container**: A running instance of an image
- **Volume**: Persistent storage that survives container restarts
- **Network**: How containers communicate with each other
- **Dockerfile**: Instructions for building an image
- **docker-compose.yml**: Define multi-container applications

## Prerequisites

- Units 01–16 complete (monorepo understanding)

## Assessment

- Exercise repo: Write a Dockerfile and docker-compose.yml for the Student Progress Tracker
- Quiz at the end of Period 4 (5 questions)
