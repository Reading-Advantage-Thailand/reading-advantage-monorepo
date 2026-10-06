/**
 * Localization types (section 8 of docs/apk3d-cartridge.md). A catalog is a nested object in
 * the advantage-games shape, so a game's strings paste into `src/locales/en.ts` at port time.
 * The implementation (`createI18n`) is `src/apk3d/i18n/catalog.ts`; games see only `ScopedI18n`.
 */

/** A leaf string or a nested scope. Keys are camelCase; plural forms are separate keys. */
export type CatalogValue = string | Catalog;

export interface Catalog {
  readonly [key: string]: CatalogValue;
}

/** Values for `{name}` placeholders; numbers are formatted by the catalog implementation. */
export type I18nParams = Readonly<Record<string, string | number>>;

/** Translates a dotted key inside the current scope; a missing key returns the key itself. */
export type Translate = (key: string, params?: I18nParams) => string;

/** The catalog view a game receives, scoped to its own catalog key (`context.i18n`). */
export interface ScopedI18n {
  /** The scope prefix, e.g. 'potionRush' or 'potionRush.hud'. */
  readonly prefix: string;
  /** `t('hud.served', { count })` */
  readonly t: Translate;
  /** True when the key resolves to a string in this scope. */
  has(key: string): boolean;
  /** A narrower view: `i18n.scope('hud').t('served')` equals `i18n.t('hud.served')`. */
  scope(prefix: string): ScopedI18n;
}

/** The diagnostic code emitted (level `warning`) when a key is missing. */
export const I18N_MISSING_KEY_CODE = 'apk3d/i18n-missing-key';
