import en from "./en";

export type LocaleDictionary = typeof en;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
	? K extends keyof T
		? PathValue<T[K & keyof T], Rest>
		: never
	: P extends keyof T
	? T[P]
	: never;

type NestedKeys<T> = T extends string
	? never
	: {
			[K in keyof T & string]: K | `${K}.${NestedKeys<T[K]>}`;
		}[keyof T & string];

export type ScopedKey<S extends string> = NestedKeys<
	PathValue<LocaleDictionary, S>
>;

export type ScopedI18n<S extends string> = (key: ScopedKey<S>) => string;

export type RootLocale = LocaleDictionary;


