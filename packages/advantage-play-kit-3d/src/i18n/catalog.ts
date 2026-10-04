/**
 * Localization (section 8 of docs/apk3d-cartridge.md): nested catalogs in the advantage-games
 * shape, scoped `t()`, `{name}` interpolation, plural keys (`.one` / `.other` with `count`).
 *
 * A missing key renders the full dotted key and calls `onMissing` once per key; the factory turns
 * that into a `warning` diagnostic (`I18N_MISSING_KEY_CODE`).
 */
import type { Catalog, CatalogValue, I18nParams, ScopedI18n, Translate } from '../contracts/i18n.js';

export interface I18nOptions {
  /** Called once per missing full key (the scope prefix included). */
  onMissing?: (key: string) => void;
}

/** The root catalog view (`prefix` ''), plus the merged catalog for tests and tooling. */
export interface I18n extends ScopedI18n {
  readonly catalog: Catalog;
}

const isCatalog = (value: CatalogValue | undefined): value is Catalog =>
  typeof value === 'object' && value !== null;

/** A plural node: `{ one?: string; other: string }`. */
const isPlural = (value: CatalogValue | undefined): value is Catalog & { other: string } =>
  isCatalog(value) && typeof value.other === 'string';

/** Deep-merges catalogs; a later catalog wins where both define the same leaf. */
export function mergeCatalogs(...catalogs: readonly Catalog[]): Catalog {
  const out: Record<string, CatalogValue> = {};
  for (const catalog of catalogs) {
    for (const [key, value] of Object.entries(catalog)) {
      const current = out[key];
      out[key] = isCatalog(value) && isCatalog(current) ? mergeCatalogs(current, value) : value;
    }
  }
  return out;
}

/** The value at a dotted key, or undefined. An empty key is the catalog itself. */
export function lookup(catalog: Catalog, key: string): CatalogValue | undefined {
  let node: CatalogValue | undefined = catalog;
  for (const part of key ? key.split('.') : []) {
    if (!isCatalog(node)) return undefined;
    node = node[part];
  }
  return node;
}

/** True when the dotted key resolves to a string or a plural node. */
export function hasKey(catalog: Catalog, key: string): boolean {
  const value = lookup(catalog, key);
  return typeof value === 'string' || isPlural(value);
}

/** Every dotted key that `t()` accepts: leaf strings, plus plural nodes by their parent key. */
export function catalogKeys(catalog: Catalog, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(catalog)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') keys.push(full);
    else if (isPlural(value)) keys.push(full);
    else keys.push(...catalogKeys(value, full));
  }
  return keys;
}

/** Replaces `{name}` with `params.name`; a placeholder without a value stays as written. */
export function format(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** The plural category used for `count` (English rules: exactly 1 is `one`). */
export const pluralCategory = (count: number): 'one' | 'other' => (count === 1 ? 'one' : 'other');

const joinKey = (prefix: string, key: string) => (prefix && key ? `${prefix}.${key}` : prefix || key);

/** Builds the runtime from one or more catalogs (the host's, then every game's). */
export function createI18n(catalogs: readonly Catalog[], options: I18nOptions = {}): I18n {
  const catalog = mergeCatalogs(...catalogs);
  const reported = new Set<string>();

  const resolve = (full: string, params?: I18nParams): string | undefined => {
    const value = lookup(catalog, full);
    if (typeof value === 'string') return format(value, params);
    if (isPlural(value)) {
      const count = params?.count;
      const form = typeof count === 'number' ? pluralCategory(count) : 'other';
      const chosen = value[form];
      return format(typeof chosen === 'string' ? chosen : value.other, params);
    }
    return undefined;
  };

  const scoped = (prefix: string): ScopedI18n => {
    const t: Translate = (key, params) => {
      const full = joinKey(prefix, key);
      const text = resolve(full, params);
      if (text !== undefined) return text;
      if (!reported.has(full)) {
        reported.add(full);
        options.onMissing?.(full);
      }
      return full;
    };
    return {
      prefix,
      t,
      has: (key) => hasKey(catalog, joinKey(prefix, key)),
      scope: (next) => scoped(joinKey(prefix, next)),
    };
  };

  return { catalog, ...scoped('') };
}
