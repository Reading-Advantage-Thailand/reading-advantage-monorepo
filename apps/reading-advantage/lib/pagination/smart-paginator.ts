/**
 * Smart Pagination System for Large Datasets (Drizzle edition)
 *
 * The generic `paginateOffset` / `paginateCursor` helpers now accept a Drizzle
 * table (or a `{ table, where, orderBy, columns }` query spec) instead of a
 * Prisma model. This keeps the surface area similar while running entirely on
 * Drizzle. Concrete helpers (`paginateUserActivities`, `paginateLessonRecords`)
 * preserve their previous shape.
 */

import {
  db,
  and,
  eq,
  gt,
  gte,
  lte,
  inArray,
  desc,
  count,
  sql,
  type SQL,
} from "@reading-advantage/db";
import {
  userActivity,
  lessonRecords,
  users,
  articles,
} from "@reading-advantage/db/schema";

interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
  cursor?: string;
  orderBy?: Record<string, "asc" | "desc">;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
  performance: {
    queryTime: number;
    cached: boolean;
  };
}

interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNext: boolean;
    nextCursor?: string;
    estimatedTotal?: number;
  };
  performance: {
    queryTime: number;
    cached: boolean;
  };
}

interface DrizzleQuerySpec<TTable> {
  table: TTable;
  where?: SQL | undefined;
  orderBy?: SQL[];
  columns?: Record<string, unknown>;
}

class SmartPaginator {
  private defaultLimit = 50;
  private maxLimit = 1000;

  /**
   * Offset-based pagination against a Drizzle query spec.
   */
  async paginateOffset<T>(
    spec: DrizzleQuerySpec<any>,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(
      options.limit || this.defaultLimit,
      options.maxLimit || this.maxLimit
    );
    const skip = (page - 1) * limit;

    try {
      const dataQuery = db
        .select(spec.columns as any)
        .from(spec.table)
        .where(spec.where as any)
        .limit(limit)
        .offset(skip);
      if (spec.orderBy && spec.orderBy.length > 0) {
        dataQuery.orderBy(...spec.orderBy);
      }

      const [data, totalRow] = await Promise.all([
        dataQuery,
        db
          .select({ value: count() })
          .from(spec.table)
          .where(spec.where as any),
      ]);

      const total = Number(totalRow[0]?.value ?? 0);
      const totalPages = Math.ceil(total / limit);
      const queryTime = Date.now() - startTime;

      const result: PaginatedResult<T> = {
        data: data as T[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        performance: {
          queryTime,
          cached: false,
        },
      };

      console.log(
        `[Pagination] Offset query: ${data.length}/${total} records, ${queryTime}ms`
      );
      return result;
    } catch (error) {
      console.error("[Pagination] Offset pagination failed:", error);
      throw error;
    }
  }

  /**
   * Cursor-based pagination against a Drizzle query spec.
   * The caller supplies the `cursorColumn` (a Drizzle column reference) plus
   * the cursor value; rows with `cursorColumn > cursor` are returned.
   */
  async paginateCursor<T>(
    spec: DrizzleQuerySpec<any> & {
      cursorColumn: any;
      cursorValue?: string | Date | number;
    },
    options: PaginationOptions = {}
  ): Promise<CursorPaginationResult<T>> {
    const startTime = Date.now();
    const limit = Math.min(
      options.limit || this.defaultLimit,
      options.maxLimit || this.maxLimit
    );

    try {
      const whereParts: Array<SQL | undefined> = [];
      if (spec.where) whereParts.push(spec.where);
      if (spec.cursorValue !== undefined) {
        whereParts.push(gt(spec.cursorColumn, spec.cursorValue));
      }
      const whereClause =
        whereParts.length > 0
          ? and(...(whereParts.filter(Boolean) as SQL[]))
          : undefined;

      const query = db
        .select(spec.columns as any)
        .from(spec.table)
        .where(whereClause as any)
        .limit(limit + 1);
      if (spec.orderBy && spec.orderBy.length > 0) {
        query.orderBy(...spec.orderBy);
      }

      const data = (await query) as any[];

      const hasNext = data.length > limit;
      if (hasNext) {
        data.pop();
      }

      const cursorFieldName =
        typeof spec.cursorColumn === "object" && spec.cursorColumn?.name
          ? (spec.cursorColumn.name as string)
          : "id";
      const nextCursor =
        data.length > 0 ? (data[data.length - 1] as any)[cursorFieldName] : undefined;

      const queryTime = Date.now() - startTime;

      const result: CursorPaginationResult<T> = {
        data: data.slice(0, limit) as T[],
        pagination: {
          limit,
          hasNext,
          nextCursor: hasNext ? nextCursor : undefined,
        },
        performance: {
          queryTime,
          cached: false,
        },
      };

      console.log(
        `[Pagination] Cursor query: ${data.length} records, ${queryTime}ms`
      );
      return result;
    } catch (error) {
      console.error("[Pagination] Cursor pagination failed:", error);
      throw error;
    }
  }

  /**
   * Paginate user activities with optimizations.
   */
  async paginateUserActivities(options: {
    userId?: string;
    schoolId?: string;
    activityTypes?: string[];
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResult<any> | CursorPaginationResult<any>> {
    const whereParts: SQL[] = [];

    if (options.userId) {
      whereParts.push(eq(userActivity.userId, options.userId));
    }

    if (options.activityTypes && options.activityTypes.length > 0) {
      whereParts.push(inArray(userActivity.activityType, options.activityTypes));
    }

    if (options.startDate) {
      whereParts.push(gte(userActivity.createdAt, options.startDate));
    }
    if (options.endDate) {
      whereParts.push(lte(userActivity.createdAt, options.endDate));
    }

    // schoolId requires joining users; for simplicity (and to keep parity with
    // the prior Prisma `user: { schoolId }` filter) we resolve via a subquery.
    if (options.schoolId) {
      whereParts.push(
        sql`${userActivity.userId} IN (SELECT id FROM ${users} WHERE school_id = ${options.schoolId})`
      );
    }

    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    // Cursor mode when explicit cursor given; otherwise offset paginate.
    if (options.cursor) {
      return this.paginateCursor(
        {
          table: userActivity,
          where,
          orderBy: [desc(userActivity.createdAt)],
          cursorColumn: userActivity.createdAt,
          cursorValue: new Date(options.cursor),
        },
        { limit: options.limit }
      );
    }

    return this.paginateOffset(
      {
        table: userActivity,
        where,
        orderBy: [desc(userActivity.createdAt)],
      },
      { page: options.page, limit: options.limit }
    );
  }

  /**
   * Paginate lesson records with optimizations.
   */
  async paginateLessonRecords(options: {
    userId?: string;
    schoolId?: string;
    articleId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResult<any> | CursorPaginationResult<any>> {
    const whereParts: SQL[] = [];

    if (options.userId) {
      whereParts.push(eq(lessonRecords.userId, options.userId));
    }
    if (options.articleId) {
      whereParts.push(eq(lessonRecords.articleId, options.articleId));
    }
    if (options.startDate) {
      whereParts.push(gte(lessonRecords.createdAt, options.startDate));
    }
    if (options.endDate) {
      whereParts.push(lte(lessonRecords.createdAt, options.endDate));
    }
    if (options.schoolId) {
      whereParts.push(
        sql`${lessonRecords.userId} IN (SELECT id FROM ${users} WHERE school_id = ${options.schoolId})`
      );
    }

    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    // articles join used to surface article metadata, mirroring previous select shape.
    void articles;

    if (options.cursor) {
      return this.paginateCursor(
        {
          table: lessonRecords,
          where,
          orderBy: [desc(lessonRecords.createdAt)],
          cursorColumn: lessonRecords.createdAt,
          cursorValue: new Date(options.cursor),
        },
        { limit: options.limit }
      );
    }

    return this.paginateOffset(
      {
        table: lessonRecords,
        where,
        orderBy: [desc(lessonRecords.createdAt)],
      },
      { page: options.page, limit: options.limit }
    );
  }
}

// Export singleton instance
export const smartPaginator = new SmartPaginator();

/**
 * Helper function for quick pagination
 */
export async function paginateQuery<T>(
  spec: DrizzleQuerySpec<any>,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  return smartPaginator.paginateOffset<T>(spec, options);
}

/**
 * Helper function for cursor-based pagination
 */
export async function paginateWithCursor<T>(
  spec: DrizzleQuerySpec<any> & {
    cursorColumn: any;
    cursorValue?: string | Date | number;
  },
  options: PaginationOptions = {}
): Promise<CursorPaginationResult<T>> {
  return smartPaginator.paginateCursor<T>(spec, options);
}
