/**
 * Smart Pagination System for Large Datasets
 * Reduces memory usage and connection time for large queries
 */

import { prisma } from "@/lib/prisma";

interface PaginationOptions {
  page?: number;
  limit?: number;
  maxLimit?: number;
  cursor?: string;
  orderBy?: Record<string, 'asc' | 'desc'>;
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

class SmartPaginator {
  private defaultLimit = 50;
  private maxLimit = 1000;
  private cacheKeyPrefix = 'pagination:';

  /**
   * Paginate with offset-based pagination (traditional)
   */
  async paginateOffset<T>(
    model: any, // Prisma model
    options: PaginationOptions & {
      where?: any;
      select?: any;
      include?: any;
    }
  ): Promise<PaginatedResult<T>> {
    const startTime = Date.now();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(options.limit || this.defaultLimit, options.maxLimit || this.maxLimit);
    const skip = (page - 1) * limit;

    // Create cache key
    const cacheKey = `${this.cacheKeyPrefix}offset:${JSON.stringify({
      model: model.name,
      where: options.where,
      select: options.select,
      page,
      limit,
      orderBy: options.orderBy,
    })}`;

    try {
      // Use transaction to get both data and count efficiently
      const [data, total] = await prisma.$transaction([
        model.findMany({
          where: options.where,
          select: options.select,
          include: options.include,
          orderBy: options.orderBy,
          skip,
          take: limit,
        }),
        model.count({
          where: options.where,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const queryTime = Date.now() - startTime;

      const result: PaginatedResult<T> = {
        data,
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

      console.log(`[Pagination] Offset query: ${data.length}/${total} records, ${queryTime}ms`);
      return result;

    } catch (error) {
      console.error('[Pagination] Offset pagination failed:', error);
      throw error;
    }
  }

  /**
   * Paginate with cursor-based pagination (more efficient for large datasets)
   */
  async paginateCursor<T>(
    model: any, // Prisma model
    options: PaginationOptions & {
      where?: any;
      select?: any;
      include?: any;
      cursorField: string; // Field to use for cursor (usually 'id' or 'createdAt')
    }
  ): Promise<CursorPaginationResult<T>> {
    const startTime = Date.now();
    const limit = Math.min(options.limit || this.defaultLimit, options.maxLimit || this.maxLimit);
    
    // Build cursor condition
    let whereClause = { ...options.where };
    if (options.cursor) {
      whereClause = {
        ...whereClause,
        [options.cursorField]: {
          gt: options.cursor, // Assuming ascending order
        },
      };
    }

    try {
      // Fetch one extra record to check if there are more
      const data = await model.findMany({
        where: whereClause,
        select: options.select,
        include: options.include,
        orderBy: options.orderBy || { [options.cursorField]: 'asc' },
        take: limit + 1,
      });

      const hasNext = data.length > limit;
      if (hasNext) {
        data.pop(); // Remove the extra record
      }

      const nextCursor = data.length > 0 
        ? data[data.length - 1][options.cursorField] 
        : undefined;

      const queryTime = Date.now() - startTime;

      const result: CursorPaginationResult<T> = {
        data: data.slice(0, limit),
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

      console.log(`[Pagination] Cursor query: ${data.length} records, ${queryTime}ms`);
      return result;

    } catch (error) {
      console.error('[Pagination] Cursor pagination failed:', error);
      throw error;
    }
  }

  /**
   * Auto-pagination that chooses the best strategy based on data size
   */
  async autoPaginate<T>(
    model: any,
    options: PaginationOptions & {
      where?: any;
      select?: any;
      include?: any;
      cursorField?: string;
      estimatedTotal?: number;
    }
  ): Promise<PaginatedResult<T> | CursorPaginationResult<T>> {
    const estimatedTotal = options.estimatedTotal || await this.estimateTotal(model, options.where);
    
    // Use cursor pagination for large datasets, offset for smaller ones
    if (estimatedTotal > 10000 || (options.page && options.page > 100)) {
      console.log(`[Pagination] Using cursor pagination for large dataset (estimated: ${estimatedTotal})`);
      
      if (!options.cursorField) {
        // Try to auto-detect cursor field
        const modelFields = await this.getModelFields(model);
        options.cursorField = modelFields.includes('createdAt') ? 'createdAt' : 
                             modelFields.includes('id') ? 'id' : 
                             modelFields.includes('updatedAt') ? 'updatedAt' : 
                             modelFields[0];
      }

      return this.paginateCursor<T>(model, options as any);
    } else {
      console.log(`[Pagination] Using offset pagination for small dataset (estimated: ${estimatedTotal})`);
      return this.paginateOffset<T>(model, options);
    }
  }

  /**
   * Estimate total count without full count query
   */
  private async estimateTotal(model: any, where?: any): Promise<number> {
    try {
      // Use EXPLAIN to estimate row count without full scan
      const explainResult = await prisma.$queryRawUnsafe<Array<{ 'QUERY PLAN': string }>>(
        `EXPLAIN SELECT COUNT(*) FROM "${model.name}" ${where ? 'WHERE ...' : ''}`
      );

      // Parse the explain output to get row estimate
      const planText = explainResult[0]?.['QUERY PLAN'] || '';
      const rowMatch = planText.match(/rows=(\d+)/);
      
      if (rowMatch) {
        return parseInt(rowMatch[1], 10);
      }

      // Fallback: sample a small subset and extrapolate
      const sampleSize = 1000;
      const sample = await model.findMany({
        where,
        take: sampleSize,
      });

      // If we got less than sample size, that's likely the total
      if (sample.length < sampleSize) {
        return sample.length;
      }

      // Otherwise, estimate based on database statistics
      return sampleSize * 10; // Conservative estimate

    } catch (error) {
      console.warn('[Pagination] Could not estimate total, using fallback');
      return 10000; // Default assumption for large dataset handling
    }
  }

  /**
   * Get model field names
   */
  private async getModelFields(model: any): Promise<string[]> {
    try {
      // This is a simplified approach - in a real implementation,
      // you might want to use Prisma's schema introspection
      return ['id', 'createdAt', 'updatedAt'];
    } catch (error) {
      console.warn('[Pagination] Could not get model fields');
      return ['id'];
    }
  }

  /**
   * Paginate user activities with optimizations
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
    const whereClause: any = {};

    if (options.userId) {
      whereClause.userId = options.userId;
    }

    if (options.schoolId) {
      whereClause.user = {
        schoolId: options.schoolId,
      };
    }

    if (options.activityTypes && options.activityTypes.length > 0) {
      whereClause.activityType = {
        in: options.activityTypes,
      };
    }

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) whereClause.createdAt.gte = options.startDate;
      if (options.endDate) whereClause.createdAt.lte = options.endDate;
    }

    return this.autoPaginate(prisma.userActivity, {
      where: whereClause,
      select: {
        id: true,
        userId: true,
        activityType: true,
        completed: true,
        createdAt: true,
        details: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      cursorField: 'createdAt',
      page: options.page,
      limit: options.limit,
      cursor: options.cursor,
    });
  }

  /**
   * Paginate lesson records with optimizations
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
    const whereClause: any = {};

    if (options.userId) {
      whereClause.userId = options.userId;
    }

    if (options.schoolId) {
      whereClause.user = {
        schoolId: options.schoolId,
      };
    }

    if (options.articleId) {
      whereClause.articleId = options.articleId;
    }

    if (options.startDate || options.endDate) {
      whereClause.createdAt = {};
      if (options.startDate) whereClause.createdAt.gte = options.startDate;
      if (options.endDate) whereClause.createdAt.lte = options.endDate;
    }

    return this.autoPaginate(prisma.lessonRecord, {
      where: whereClause,
      select: {
        id: true,
        userId: true,
        articleId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        article: {
          select: {
            title: true,
            cefrLevel: true,
            raLevel: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      cursorField: 'createdAt',
      page: options.page,
      limit: options.limit,
      cursor: options.cursor,
    });
  }
}

// Export singleton instance
export const smartPaginator = new SmartPaginator();

/**
 * Helper function for quick pagination
 */
export async function paginateQuery<T>(
  model: any,
  options: PaginationOptions & {
    where?: any;
    select?: any;
    include?: any;
  }
): Promise<PaginatedResult<T>> {
  return smartPaginator.paginateOffset<T>(model, options);
}

/**
 * Helper function for cursor-based pagination
 */
export async function paginateWithCursor<T>(
  model: any,
  options: PaginationOptions & {
    where?: any;
    select?: any;
    include?: any;
    cursorField: string;
  }
): Promise<CursorPaginationResult<T>> {
  return smartPaginator.paginateCursor<T>(model, options);
}