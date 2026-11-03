/**
 * The phoneme bank of the Storytime decodable (plan task 3.4, spec FR-7, finding F17).
 *
 * The bank holds Daniel's 45 recordings, one for each grapheme of the phonics sequence. Every file
 * follows the G3 clip-name rule `^phonemes/daniel/[0-9]{2}-[a-z]+(-[a-z]+)*\.mp3$`. The decodable
 * UI looks up one clip by grapheme. The sounds page plays the recording of the week element.
 */

/** One recording of the phoneme bank. */
export interface PhonemeClip {
  /** The grapheme that the clip teaches, in lower case. A variant shares the grapheme. */
  grapheme: string;
  /** The file, relative to the Storytime media base. */
  file: string;
}

/** The label of the bank count for the readiness report (finding A3). */
export const PHONEME_BANK_LABEL = "phoneme_clips";

/** The 45 recordings in phonics order. */
export const PHONEME_BANK: PhonemeClip[] = [
  { grapheme: "s", file: "phonemes/daniel/01-s.mp3" },
  { grapheme: "t", file: "phonemes/daniel/02-t.mp3" },
  { grapheme: "p", file: "phonemes/daniel/03-p.mp3" },
  { grapheme: "n", file: "phonemes/daniel/04-n.mp3" },
  { grapheme: "m", file: "phonemes/daniel/05-m.mp3" },
  { grapheme: "d", file: "phonemes/daniel/06-d.mp3" },
  { grapheme: "g", file: "phonemes/daniel/07-g.mp3" },
  { grapheme: "ck", file: "phonemes/daniel/08-c-k.mp3" },
  { grapheme: "r", file: "phonemes/daniel/09-r.mp3" },
  { grapheme: "h", file: "phonemes/daniel/10-h.mp3" },
  { grapheme: "b", file: "phonemes/daniel/11-b.mp3" },
  { grapheme: "f", file: "phonemes/daniel/12-f.mp3" },
  { grapheme: "l", file: "phonemes/daniel/13-l.mp3" },
  { grapheme: "j", file: "phonemes/daniel/14-j.mp3" },
  { grapheme: "v", file: "phonemes/daniel/15-v.mp3" },
  { grapheme: "w", file: "phonemes/daniel/16-w.mp3" },
  { grapheme: "x", file: "phonemes/daniel/17-x-ks.mp3" },
  { grapheme: "y", file: "phonemes/daniel/18-y.mp3" },
  { grapheme: "z", file: "phonemes/daniel/19-z.mp3" },
  { grapheme: "qu", file: "phonemes/daniel/20-qu-kw.mp3" },
  { grapheme: "ch", file: "phonemes/daniel/21-ch.mp3" },
  { grapheme: "sh", file: "phonemes/daniel/22-sh.mp3" },
  { grapheme: "th", file: "phonemes/daniel/23-th-voiced.mp3" },
  { grapheme: "th", file: "phonemes/daniel/24-th-unvoiced.mp3" },
  { grapheme: "ng", file: "phonemes/daniel/25-ng.mp3" },
  { grapheme: "a", file: "phonemes/daniel/26-a-short.mp3" },
  { grapheme: "e", file: "phonemes/daniel/27-e-short.mp3" },
  { grapheme: "i", file: "phonemes/daniel/28-i-short.mp3" },
  { grapheme: "o", file: "phonemes/daniel/29-o-short.mp3" },
  { grapheme: "u", file: "phonemes/daniel/30-u-short.mp3" },
  { grapheme: "ai", file: "phonemes/daniel/31-ai.mp3" },
  { grapheme: "ee", file: "phonemes/daniel/32-ee.mp3" },
  { grapheme: "igh", file: "phonemes/daniel/33-igh.mp3" },
  { grapheme: "oa", file: "phonemes/daniel/34-oa.mp3" },
  { grapheme: "oo", file: "phonemes/daniel/35-oo-long.mp3" },
  { grapheme: "oo", file: "phonemes/daniel/36-oo-short.mp3" },
  { grapheme: "ar", file: "phonemes/daniel/37-ar.mp3" },
  { grapheme: "or", file: "phonemes/daniel/38-or.mp3" },
  { grapheme: "ur", file: "phonemes/daniel/39-ur.mp3" },
  { grapheme: "ow", file: "phonemes/daniel/40-ow.mp3" },
  { grapheme: "oi", file: "phonemes/daniel/41-oi.mp3" },
  { grapheme: "ear", file: "phonemes/daniel/42-ear.mp3" },
  { grapheme: "air", file: "phonemes/daniel/43-air.mp3" },
  { grapheme: "ure", file: "phonemes/daniel/44-ure.mp3" },
  { grapheme: "er", file: "phonemes/daniel/45-er.mp3" },
];

/** The labeled bank count, `phoneme_clips=45` (finding A3). */
export const PHONEME_BANK_COUNT = `${PHONEME_BANK_LABEL}=${PHONEME_BANK.length}`;
