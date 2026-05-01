import { z } from 'zod';

export type FormFieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'switch';

export type SelectOption = {
  label: string;
  labelKey?: string;
  value: string | number;
};

export type SchemaFieldOverride = Partial<
  Omit<GeneratedFormField, 'name' | 'required'> & {
    order?: number;
    required?: boolean;
  }
>;

export type SchemaFieldConfig = Record<string, SchemaFieldOverride>;

export type GeneratedFormField = {
  name: string;
  label: string;
  /**
   * Optional translation key for the label. Rendering layers can decide
   * whether to prioritise the translated value or the literal label.
   */
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  placeholder?: string;
  placeholderKey?: string;
  type: FormFieldKind;
  required: boolean;
  options?: SelectOption[];
  hidden?: boolean;
  /**
   * Arbitrary component-specific props (e.g. min/max, pattern).
   */
  inputProps?: Record<string, unknown>;
  meta: {
    zodType: z.ZodTypeAny;
    baseType: z.ZodTypeAny;
    optional: boolean;
    nullable: boolean;
  };
};

type BuildFormFieldsOptions<
  Schema extends z.ZodRawShape,
  Output = GeneratedFormField[]
> = {
  schema: z.ZodObject<Schema>;
  overrides?: SchemaFieldConfig;
  /**
   * Optional hook to post-process the generated fields before returning.
   * Useful for injecting project-specific defaults.
   */
  transform?: (fields: GeneratedFormField[]) => Output;
};

const HUMANIZE_REGEX = /([a-z0-9])([A-Z])/g;

const DEFAULT_TEXTAREA_THRESHOLD = 80;

function humanize(fieldName: string) {
  return fieldName
    .replace(HUMANIZE_REGEX, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, match => match.toUpperCase());
}

function unwrapType(
  schema: z.ZodTypeAny
): { type: z.ZodTypeAny; optional: boolean; nullable: boolean } {
  let current: z.ZodTypeAny = schema;
  let optional = false;
  let nullable = false;

  // Keep unwrapping until we reach the base type (string, number, enum, etc.)
  while (true) {
    if (current instanceof z.ZodOptional) {
      optional = true;
      current = current._def.innerType;
      continue;
    }

    if (current instanceof z.ZodNullable) {
      nullable = true;
      current = current._def.innerType;
      continue;
    }

    if (current instanceof z.ZodDefault) {
      optional = true;
      current = current._def.innerType;
      continue;
    }

    if (current instanceof z.ZodCatch) {
      optional = true;
      current = current._def.innerType;
      continue;
    }

    if (current instanceof z.ZodEffects) {
      current = current._def.schema;
      continue;
    }

    if (current instanceof z.ZodPipeline) {
      current = current._def.out;
      continue;
    }

    break;
  }

  return { type: current, optional, nullable };
}

function defaultFieldType(type: z.ZodTypeAny): FormFieldKind {
  if (type instanceof z.ZodNumber) {
    return 'number';
  }

  if (type instanceof z.ZodBoolean) {
    return 'switch';
  }

  if (type instanceof z.ZodEnum || type instanceof z.ZodNativeEnum) {
    return 'select';
  }

  if (type instanceof z.ZodArray) {
    return 'select';
  }

  return 'text';
}

function deriveOptions(type: z.ZodTypeAny): SelectOption[] | undefined {
  if (type instanceof z.ZodEnum) {
    return type.options.map((value: string) => ({
      label: humanize(value),
      value,
    }));
  }

  if (type instanceof z.ZodNativeEnum) {
    const values = Object.values(type.enum) as (string | number)[];
    return values.map(value => ({
      label: humanize(String(value)),
      value,
    }));
  }

  return undefined;
}

function shouldRenderTextarea(type: z.ZodTypeAny, override?: SchemaFieldOverride) {
  if (override?.type === 'textarea') {
    return true;
  }

  if (override?.type && override.type !== 'text') {
    return false;
  }

  if (!(type instanceof z.ZodString)) {
    return false;
  }

  const max = type._def.checks?.find?.(
    check => check.kind === 'max'
  ) as undefined | { kind: 'max'; value: number };

  return !!max && max.value >= DEFAULT_TEXTAREA_THRESHOLD;
}

export function buildFormFields<
  Schema extends z.ZodRawShape,
  Output = GeneratedFormField[]
>({
  schema,
  overrides = {},
  transform,
}: BuildFormFieldsOptions<Schema, Output>) {
  const shape = schema.shape;
  const fields: GeneratedFormField[] = [];

  for (const [name, zodType] of Object.entries(shape)) {
    const override = overrides[name];
    const { type: baseType, optional, nullable } = unwrapType(zodType);
    let resolvedType = override?.type ?? defaultFieldType(baseType);

    if (shouldRenderTextarea(baseType, override)) {
      resolvedType = 'textarea';
    }

    const defaultLabel = humanize(name);
    const field: GeneratedFormField = {
      name,
      label: override?.label ?? defaultLabel,
      labelKey: override?.labelKey,
      description: override?.description,
      descriptionKey: override?.descriptionKey,
      placeholder: override?.placeholder,
      placeholderKey: override?.placeholderKey,
      type: resolvedType,
      required: override?.required ?? (!optional && !nullable),
      options: override?.options ?? deriveOptions(baseType),
      hidden: override?.hidden ?? false,
      inputProps: override?.inputProps,
      meta: {
        zodType,
        baseType,
        optional,
        nullable,
      },
    };

    fields.push(field);
  }

  const ordered = fields
    .map(field => {
      const override = overrides[field.name];
      return {
        field,
        order: override?.order ?? Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) => {
      if (a.order === b.order) {
        return 0;
      }

      return a.order - b.order;
    })
    .map(entry => entry.field)
    .filter(field => !field.hidden);

  return transform ? transform(ordered) : (ordered as Output);
}
