import rawCurriculumBindings from "./data/curriculum-bindings.json" with { type: "json" };

import { parseCurriculumBindingRelease } from "./bindings.js";

/** Validated source-backed binding release for all current Codecamp curriculum activities. */
export const curriculumBindings = parseCurriculumBindingRelease(rawCurriculumBindings);
