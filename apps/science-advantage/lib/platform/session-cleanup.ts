interface SessionStore {
  findMany(args: {
    where: { expiresAt: { lt: Date } };
    select: { id: true; expiresAt: true };
    take?: number;
  }): Promise<Array<{ id: string; expiresAt: Date }>>;
  deleteMany(args: {
    where: { id: { in: string[] } };
  }): Promise<{ count: number }>;
}

interface CleanupOptions {
  maxAgeMs: number;
  batchSize: number;
  intervalMs?: number;
}

interface CleanupTask {
  run(): Promise<void>;
  start(): void;
  stop(): void;
}

export function createCleanupTask(
  client: { session: SessionStore },
  options: CleanupOptions
): CleanupTask {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  async function run(): Promise<void> {
    if (stopped) return;

    const cutoff = new Date(Date.now() - options.maxAgeMs);

    while (!stopped) {
      const staleSessions = await client.session.findMany({
        where: {
          expiresAt: { lt: cutoff },
        },
        select: {
          id: true,
          expiresAt: true,
        },
        take: options.batchSize,
      });

      if (staleSessions.length === 0) {
        break;
      }

      await client.session.deleteMany({
        where: {
          id: { in: staleSessions.map((s) => s.id) },
        },
      });

      if (staleSessions.length < options.batchSize) {
        break;
      }
    }
  }

  function start(): void {
    if (intervalId !== null) return;
    stopped = false;
    intervalId = setInterval(
      () => {
        run().catch(() => {});
      },
      options.intervalMs ?? 60 * 60 * 1000
    );
  }

  function stop(): void {
    stopped = true;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { run, start, stop };
}
