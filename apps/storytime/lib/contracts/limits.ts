/**
 * The level and week bounds of the Storytime week contract (plan task 2.2, spec FR-3,
 * finding F131).
 *
 * The two numbers live apart from the schema module, so a module that reads only the bounds
 * does not pull the schema library into the browser bundle. The route parser reads them in the
 * browser, because the not-found view is a client module, and the week contract keeps its
 * bounds from the same two numbers.
 */

/** The highest level of the week contract. */
export const LEVEL_MAX = 4;

/** The highest week number of the week contract. */
export const WEEK_MAX = 32;
