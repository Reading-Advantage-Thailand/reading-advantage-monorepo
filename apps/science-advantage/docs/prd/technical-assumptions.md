---
title: Technical Architecture & Assumptions
type: prd
status: draft
created_at: 2025-11-29
tags: [architecture, technology-stack, monorepo, microservices]
description: Outlines core technical assumptions including the monorepo structure, service architecture (Node.js/Next.js), database choices (PostgreSQL/Redis), and testing requirements.
---

# Technical Assumptions

## Repository Structure: Monorepo

The project shall use a monorepo structure to maintain consistency with the existing Advantage ecosystem and facilitate code sharing between products. This approach enables unified dependency management, shared component libraries, and streamlined CI/CD pipelines across the integrated K-12 platform.

## Service Architecture

The platform shall implement a microservices architecture within the monorepo, building upon the existing Advantage ecosystem infrastructure. Core services include Authentication Service (leveraging existing SSO), Curriculum Service, Virtual Laboratory Service, AI Recommendation Engine, Analytics Service, and Content Management Service. This architecture enables independent scaling, fault isolation, and technology diversity while maintaining ecosystem integration.

## Testing Requirements

The platform shall implement a comprehensive testing pyramid including unit tests (70% coverage), integration tests for service interactions, end-to-end tests for critical user journeys, and performance testing for load handling. Automated testing shall be integrated into CI/CD pipelines with manual testing protocols for educational content validation and user experience verification.

## Additional Technical Assumptions and Requests

- **Frontend Framework**: React/Next.js for consistency with existing Advantage products and server-side rendering capabilities
- **Backend Technology**: Node.js with TypeScript for type safety and developer productivity, following existing ecosystem patterns
- **Database**: PostgreSQL for relational data with Redis caching for session management and real-time features
- **AI/ML Infrastructure**: Python-based recommendation engine integrated via REST APIs, leveraging existing Advantage AI platform
- **Mobile Development**: React Native for cross-platform mobile applications with shared business logic
- **Cloud Infrastructure**: AWS for consistency with ecosystem, utilizing existing Advantage accounts and configurations
- **API Gateway**: Unified API patterns across all Advantage products with versioning and backward compatibility
- **Content Delivery**: CDN integration for multimedia content with Thai language optimization
- **Real-time Features**: WebSocket implementation for live tutoring and collaborative learning features
- **Security**: OAuth 2.0 and JWT tokens for authentication, building on existing Advantage SSO system
- **Monitoring**: Application performance monitoring and error tracking integrated with existing Advantage monitoring systems
- **Deployment**: Automated CI/CD pipeline with blue-green deployment for zero-downtime releases
