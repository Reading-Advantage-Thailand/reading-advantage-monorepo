// Firestore compatibility stub — all operations are no-ops that log warnings.
// Replace callers with Prisma/Drizzle queries as they are migrated.
// This file exists only to keep legacy code compiling while migration is in progress.

function noopWarn(op: string, collection: string) {
  console.warn(`[firestore-stub] ${op} on "${collection}" — Firestore removed, no-op`);
}

function createDocRef(collection: string, id: string) {
  return {
    get: async () => ({ exists: false, data: () => undefined }),
    set: async (data: unknown, opts?: unknown) => noopWarn("set", `${collection}/${id}`),
    update: async (data: unknown) => noopWarn("update", `${collection}/${id}`),
    delete: async () => noopWarn("delete", `${collection}/${id}`),
    collection: (sub: string) => createCollectionRef(`${collection}/${id}/${sub}`),
  };
}

function createCollectionRef(collection: string) {
  return {
    doc: (id: string) => createDocRef(collection, id),
    add: async (data: unknown) => {
      noopWarn("add", collection);
      return { id: "stub-id" };
    },
    get: async () => ({ empty: true, docs: [] as unknown[] }),
    where: (...args: unknown[]) => createCollectionRef(collection),
    orderBy: (...args: unknown[]) => createCollectionRef(collection),
    startAt: (...args: unknown[]) => createCollectionRef(collection),
    limit: (n: number) => createCollectionRef(collection),
    select: (...args: unknown[]) => createCollectionRef(collection),
  };
}

const db = {
  collection: (name: string) => createCollectionRef(name),
  doc: (path: string) => createDocRef("", path),
};

export default db;
