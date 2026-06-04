# Route → Service Delegation Pattern

> Template for migrating `apps/science-advantage/app/api/**/route.ts` from inline DB calls to thin domain-function delegation.

## Target Architecture

Every route handler should be **< 50 lines** and do exactly three things:
1. **Authenticate** — get the session via `getCurrentSession()` or `requireAuth()`
2. **Authorize + Execute** — call a domain function that handles `assertCan` + business logic
3. **Respond** — return `NextResponse.json(data, { status })`

## Before (Fat Route)

```ts
import { db, eq, and } from '@reading-advantage/db';
import { scienceClasses, users } from '@reading-advantage/db/schema';
import { getCurrentSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: 'Auth required' }, { status: 401 });
  
  // Hand-rolled role check (BAD)
  if (session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Inline DB query (BAD)
  const classes = await db.select().from(scienceClasses)...
  
  return NextResponse.json({ classes });
}
```

## After (Thin Route)

```ts
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { listClasses } from '@/lib/services/classes/list-classes';

/**
 * GET /api/classes
 * Returns classes for the authenticated teacher.
 */
export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const result = await listClasses({
      user: session.user,
      tenant: { schoolId: session.user.schoolId },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === 'UNAUTHORIZED' ? 401 : 403 }
      );
    }
    console.error('Failed to list classes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Domain Function Pattern

```ts
import { db } from '@reading-advantage/db';
import { assertCan } from '@reading-advantage/auth';
import type { UserContext, Tenant } from '@reading-advantage/auth';

/**
 * Lists classes for a teacher.
 * @param ctx.user - The authenticated user context
 * @param ctx.tenant - The tenant context
 * @returns Array of class summaries
 */
export async function listClasses(ctx: {
  user: UserContext;
  tenant?: Tenant;
}) {
  assertCan(ctx.user, 'class:list', ctx.tenant);
  
  const classes = await db
    .select({...})
    .from(scienceClasses)
    .where(eq(scienceClasses.teacherId, ctx.user.id));
    
  return { classes };
}
```

## Key Rules

1. **No `db` import in routes** — all DB access goes through domain functions
2. **No `role ===` checks in routes** — authorization is in domain functions via `assertCan`
3. **Routes handle HTTP concerns only** — parsing request, calling domain function, shaping response
4. **Domain functions handle business concerns** — auth, validation, DB queries, error handling
5. **Use `AuthError` from `@reading-advantage/auth`** — routes catch it and return 401/403
6. **Keep response shapes stable** — domain functions return the same data the route used to

## Testing Pattern

```ts
// Mock the domain function, NOT the db
vi.mock('@/lib/services/classes/list-classes', () => ({
  listClasses: vi.fn(),
}));

it('returns classes for authenticated teacher', async () => {
  const { listClasses } = await import('@/lib/services/classes/list-classes');
  (listClasses as any).mockResolvedValue({ classes: [{ id: '1', name: 'Test' }] });
  
  const res = await GET();
  const data = await res.json();
  
  expect(res.status).toBe(200);
  expect(data.classes).toHaveLength(1);
  expect(listClasses).toHaveBeenCalledWith({
    user: expect.objectContaining({ role: 'TEACHER' }),
    tenant: expect.any(Object),
  });
});
```
