#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createNodeTutorialCheckerPorts, runTutorialStep } from "./checker.js";
import { tutorialManifestSchema } from "./contracts.js";

const stepIndex = process.argv.indexOf("--step");
const stepId = stepIndex >= 0 ? process.argv[stepIndex + 1] : undefined;
if (!stepId) throw new Error("Usage: tutorial-check --step <step-id>");
const root = process.cwd();
const manifest = tutorialManifestSchema.parse(JSON.parse(await readFile(resolve(root, "activity-tutorial.json"), "utf8")));
const result = await runTutorialStep(manifest, stepId, createNodeTutorialCheckerPorts(root, manifest));
process.stdout.write(`${JSON.stringify(result)}\n`);
process.exitCode = result.passed ? 0 : 1;
