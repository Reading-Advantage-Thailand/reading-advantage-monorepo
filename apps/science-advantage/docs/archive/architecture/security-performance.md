---
title: Security & Performance Guidelines
type: archive
status: deprecated
created_at: 2025-11-29
tags: [archive, architecture, security, performance, best-practices]
description: Guidelines and requirements for ensuring application security and optimal performance.
---

# Security and Performance

## Overview

The Science Advantage platform implements a comprehensive security and performance strategy designed to protect sensitive student data while ensuring fast, reliable access to educational content. This architecture addresses GDPR/FERPA compliance requirements for educational data protection and implements performance optimizations suitable for interactive learning experiences.

## Security Requirements

### Frontend Security

#### Content Security Policy (CSP)

A strict Content Security Policy is implemented to prevent XSS attacks and data injection:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
        ],
      },
    ];
  },
};
```

#### XSS Prevention

- **Input Sanitization**: All user inputs are sanitized on the backend before being stored or rendered.
- **Auto-escaping**: React's built-in JSX auto-escaping prevents XSS in dynamic content.
- **HTTP-only Cookies**: Authentication tokens stored in HTTP-only cookies prevent JavaScript access.


#### Secure Storage

- **Session Storage**: Temporary data is stored in sessionStorage. Sensitive data is encrypted before being stored.
- **Local Storage**: Usage is limited to non-sensitive UI preferences.
- **Memory Storage**: Sensitive operations keep data in memory only.


### Backend Security

#### Input Validation

Comprehensive input validation using Zod schemas:

```typescript
// lib/validation.ts
import { z } from 'zod';

export const CreateClassSchema = z.object({
  name: z
    .string()
    .min(1, 'Class name is required')
    .max(100, 'Class name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Invalid characters in class name'),
  description: z.string().max(500, 'Description too long').optional(),
  joinCode: z
    .string()
    .min(4, 'Join code too short')
    .max(20, 'Join code too long')
    .regex(/^[A-Z0-9]+$/, 'Join code must be uppercase letters and numbers'),
});

export const SubmitExperimentSchema = z.object({
  lessonId: z.string().cuid(),
  data: z.record(z.any()),
  observations: z
    .string()
    .min(1, 'Observations required')
    .max(2000, 'Observations too long')
});
```

#### Rate Limiting

Implementation of rate limiting to prevent abuse is handled at the API gateway or middleware level.


#### CORS Configuration

Strict CORS policy for API endpoints:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value:
              process.env.NODE_ENV === 'production'
                ? 'https://science-advantage.vercel.app'
                : 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
    ];
  },
};
```

### Authentication Security

#### Token Management

Secure session token configuration:

```typescript
// lib/auth/session.ts
// Session tokens are stored in HTTP-only cookies with secure attributes.
// The cookie configuration is handled by the custom authentication logic.
```

#### Session Security

- **Session Rotation**: Automatic session token rotation on sensitive operations
- **Device Fingerprinting**: Track session devices for anomaly detection
- **Concurrent Session Limits**: Limit active sessions per user

```typescript
// lib/session-security.ts
export class SessionSecurity {
  static async validateSession(session: Session): Promise<boolean> {
    // Check session age
    const sessionAge = Date.now() - new Date(session.expiresAt).getTime();
    if (sessionAge > 60 * 60 * 1000) { // 1 hour
      return false;
    }

    // Check for suspicious activity
    const suspiciousActivity = await this.detectSuspiciousActivity(
      session.userId
    );
    if (suspiciousActivity) {
      return false;
    }

    return true;
  }

  static async detectSuspiciousActivity(userId: string): Promise<boolean> {
    // Implement anomaly detection logic
    // - Multiple failed login attempts
    // - Unusual IP addresses
    // - Rapid session creation
    return false;
  }
}
```

### Data Protection for Student Information

#### GDPR/FERPA Compliance

```typescript
// lib/data-protection.ts
export class DataProtection {
  // Data anonymization for analytics
  static anonymizeUserData(user: User): any {
    return {
      id: this.hashUserId(user.id),
      role: user.role,
      // Remove PII
      email: undefined,
      name: undefined,
      image: undefined,
    };
  }

  // Data retention policies
  static async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 7); // 7-year retention

    await prisma.attempt.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
  }

  // Right to be forgotten
  static async deleteUserAccount(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Anonymize instead of delete for data integrity
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `deleted-${userId}@deleted.com`,
          name: 'Deleted User',
          image: null,
        },
      });

      // Delete sensitive data
      await tx.attempt.deleteMany({ where: { userId } });
      await tx.experimentSubmission.deleteMany({ where: { userId } });
    });
  }

  private static hashUserId(userId: string): string {
    // Implementation of hashing
    return 'hashed_user_id';
  }
}
```

#### Audit Logging

Comprehensive audit trail for all data operations:

```typescript
// lib/audit.ts
export class AuditLogger {
  static async logDataAccess({
    userId,
    action,
    resource,
    resourceId,
    metadata,
  }: {
    userId: string;
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';
    resource: string;
    resourceId?: string;
    metadata?: any;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        metadata,
        timestamp: new Date(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });
  }
}
```

## Performance Optimization

### Frontend Performance

#### Bundle Size Optimization

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-slot',
      'lucide-react',
      'class-variance-authority',
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

#### Code Splitting and Lazy Loading

```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ClassManager = dynamic(() => import('@/components/features/classes/ClassManager'), {
  loading: () => <div>Loading classes...</div>,
  ssr: false
});

const ExperimentViewer = dynamic(() => import('@/components/features/experiments/ExperimentViewer'), {
  loading: () => <div>Loading experiment...</div>
});

export default function DashboardPage() {
  return (
    <div>
      <ClassManager />
      <ExperimentViewer />
    </div>
  );
}
```

#### Image and Asset Optimization

```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative overflow-hidden">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        onLoadingComplete={() => setIsLoading(false)}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
}
```

#### Caching Strategy

```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedClasses = unstable_cache(
  async (teacherId: string) => {
    return prisma.class.findMany({
      where: { teacherId },
      include: {
        enrollments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });
  },
  ['classes'],
  {
    revalidate: 300, // 5 minutes
    tags: ['classes'],
  }
);

export const getCachedLesson = unstable_cache(
  async (lessonId: string) => {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        questions: true,
        experimentData: true,
      },
    });
  },
  ['lesson'],
  {
    revalidate: 600, // 10 minutes
    tags: ['lesson'],
  }
);
```

### Backend Performance

#### Database Optimization

```typescript
// lib/db-optimizations.ts
export class DatabaseOptimizer {
  // Connection pooling configuration
  static getPrismaConfig() {
    return {
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
    };
  }

  // Optimized queries with proper indexing
  static async getUserClassesOptimized(userId: string) {
    return prisma.classEnrollment.findMany({
      where: { userId },
      select: {
        class: {
          select: {
            id: true,
            name: true,
            description: true,
            teacher: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        enrolledAt: true,
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });
  }

  // Batch operations for better performance
  static async batchCreateAttempts(
    attempts: Array<{
      userId: string;
      lessonId: string;
      score: number;
      answers: any;
    }>
  ) {
    return prisma.attempt.createMany({
      data: attempts,
      skipDuplicates: true,
    });
  }
}
```

#### Response Time Optimization

```typescript
// app/api/lessons/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedLesson } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const startTime = Date.now();

    const lesson = await getCachedLesson(params.slug);

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    const responseTime = Date.now() - startTime;

    // Log performance metrics
    console.log(`Lesson ${params.slug} loaded in ${responseTime}ms`);

    return NextResponse.json({
      data: lesson,
      meta: {
        responseTime,
        cached: true,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Monitoring and Metrics

#### Performance Monitoring

```typescript
// lib/monitoring.ts
export class PerformanceMonitor {
  static async measureApiCall<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      // Log performance metrics
      this.logMetric(name, duration, 'success');

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.logMetric(name, duration, 'error');

      throw error;
    }
  }

  private static logMetric(name: string, duration: number, status: string) {
    // Send to monitoring service (e.g., Vercel Analytics, DataDog)
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          duration,
          status,
          timestamp: new Date().toISOString(),
        }),
      });
    }
  }
}
```

#### Real User Monitoring (RUM)

```typescript
// hooks/use-performance.ts
import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
      import('web-vitals').then(
        ({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
          getCLS(console.log);
          getFID(console.log);
          getFCP(console.log);
          getLCP(console.log);
          getTTFB(console.log);
        }
      );
    }

    // Monitor route changes
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log(
            'Page load time:',
            navEntry.loadEventEnd - navEntry.loadEventStart
          );
        }
      }
    });

    observer.observe({ entryTypes: ['navigation'] });

    return () => observer.disconnect();
  }, []);
}
```

#### Error Tracking and Performance Alerts

```typescript
// lib/error-tracking.ts
export class ErrorTracker {
  static trackError(error: Error, context?: any) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Send to error tracking service
    this.sendErrorReport(errorData);
  }

  static trackPerformanceIssue(
    metric: string,
    value: number,
    threshold: number
  ) {
    if (value > threshold) {
      this.sendAlert({
        type: 'performance',
        metric,
        value,
        threshold,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private static async sendErrorReport(errorData: any) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch {
      // Fallback to console logging
      console.error('Error tracking failed:', errorData);
    }
  }

  private static async sendAlert(alertData: any) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
    } catch {
      console.error('Alert sending failed:', alertData);
    }
  }
}
```

## Security and Performance Standards

### Performance Benchmarks

- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **API Response Times**: < 200ms (95th percentile)
- **Database Query Times**: < 100ms (average)

### Security Requirements

- **Data Encryption**: AES-256 for data at rest, TLS 1.3 for data in transit
- **Authentication**: Multi-factor authentication for admin accounts
- **Authorization**: Role-based access control (RBAC) with principle of least privilege
- **Audit Trail**: Complete audit logs for all data access and modifications
- **Compliance**: GDPR and FERPA compliant data handling practices
- **Penetration Testing**: Quarterly security assessments
- **Vulnerability Scanning**: Weekly automated security scans

### Monitoring Requirements

- **Uptime**: 99.9% availability target
- **Error Rate**: < 0.1% for all API endpoints
- **Security Incidents**: Immediate alerting and response within 1 hour
- **Performance Degradation**: Alerts for response times > 500ms
- **Data Access**: Real-time monitoring of sensitive data access

This comprehensive security and performance architecture ensures that the Science Advantage platform provides a secure, fast, and reliable learning environment for students and teachers while maintaining compliance with educational data protection regulations.