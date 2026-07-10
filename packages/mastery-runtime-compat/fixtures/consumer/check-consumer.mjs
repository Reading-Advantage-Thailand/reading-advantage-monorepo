import { pathToFileURL } from "node:url";

const [gatePath, descriptorPath] = process.argv.slice(2);
if (!gatePath || !descriptorPath) {
  throw new Error("Expected the built compatibility gate and consumer descriptor paths.");
}

const enginePackages = [
  "@reading-advantage/knowledge-space-core",
  "@reading-advantage/knowledge-space-practice",
  "@reading-advantage/practice-core",
  "@reading-advantage/srs-engine",
];
for (const packageName of enginePackages) {
  const module = await import(packageName);
  if (Object.keys(module).length === 0) {
    throw new Error(`${packageName} exposed no public runtime values.`);
  }
}

const gate = await import(pathToFileURL(gatePath).href);
const result = await gate.runConsumerCompatibilityGateFromPath(descriptorPath);
if (!result.compatible) {
  throw new Error(`Clean consumer compatibility failed: ${JSON.stringify(result.issues)}`);
}
