import { cp, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist/data/", import.meta.url), { recursive: true });
await cp(
  new URL("../src/data/sales-knowledge-space.json", import.meta.url),
  new URL("../dist/data/sales-knowledge-space.json", import.meta.url),
);
await cp(
  new URL("../src/data/sales-curriculum-bindings.json", import.meta.url),
  new URL("../dist/data/sales-curriculum-bindings.json", import.meta.url),
);
await cp(
  new URL("../src/data/sales-release-evidence.json", import.meta.url),
  new URL("../dist/data/sales-release-evidence.json", import.meta.url),
);
await cp(
  new URL("../src/data/evidence/", import.meta.url),
  new URL("../dist/data/evidence/", import.meta.url),
  { recursive: true },
);
