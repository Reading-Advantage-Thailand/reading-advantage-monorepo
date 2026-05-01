const BILINGUAL_DELIMITER = ' / ';

interface BilingualSplit {
  english: string;
  thai: string | null;
}

/**
 * Parse a bilingual title using the "English / Thai" convention.
 * Splits on the first occurrence of " / " delimiter.
 */
export function parseBilingualTitle(title: string): BilingualSplit {
  const delimiterIndex = title.indexOf(BILINGUAL_DELIMITER);

  if (delimiterIndex === -1) {
    return { english: title, thai: null };
  }

  const english = title.substring(0, delimiterIndex).trim();
  const thai = title.substring(delimiterIndex + BILINGUAL_DELIMITER.length).trim();

  return { english, thai };
}

/**
 * Split a bilingual field value on the " / " delimiter.
 * Returns null for thai if no delimiter is found.
 */
export function splitBilingualField(value: string | null | undefined): BilingualSplit {
  if (value === null || value === undefined) {
    return { english: null as unknown as string, thai: null };
  }

  const delimiterIndex = value.indexOf(BILINGUAL_DELIMITER);

  if (delimiterIndex === -1) {
    return { english: value, thai: null };
  }

  const english = value.substring(0, delimiterIndex).trim();
  const thai = value.substring(delimiterIndex + BILINGUAL_DELIMITER.length).trim();

  return { english, thai };
}
