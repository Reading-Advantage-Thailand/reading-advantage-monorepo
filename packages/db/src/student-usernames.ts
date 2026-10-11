import { randomInt } from "node:crypto";

// The student username rule (owner decision 2026-10-08): two simple English words and two digits,
// for example `bluetiger47`. A username is set once and follows the student for years, so it has no
// email, no class, and no grade part. It lives in this package because the legacy ETL (here) and the
// student-login domain both use it, and `db` is the lowest package.
// The words are kind and plain for children aged 8-12. The noun list leaves out animals that are
// insults in Thai (buffalo, dog, monitor lizard, chicken) and words with an adult slang meaning.

/** First words of a student username. */
export const STUDENT_USERNAME_ADJECTIVES = [
  "red", "blue", "green", "pink", "gold", "silver", "purple", "orange", "yellow", "white",
  "happy", "brave", "kind", "smart", "quick", "cool", "calm", "lucky", "sunny", "super",
  "magic", "royal", "golden", "bright", "shiny", "jolly", "merry", "proud", "swift", "gentle",
  "clever", "bold", "fresh", "sweet", "tiny", "giant", "little", "mighty", "noble", "rapid",
  "sparkly", "starry", "snowy", "windy", "rainy", "cloudy", "frosty", "misty", "icy", "fiery",
  "sandy", "rocky", "leafy", "cosmic", "neon", "turbo", "cozy", "fuzzy", "fluffy", "bouncy",
  "zippy", "lively", "wild", "free", "grand", "great", "fancy", "wise", "polite", "honest",
  "cheery", "secret", "flying", "dancing", "singing", "jumping", "running", "smiling", "glowing", "shining",
  "coral", "ruby", "jade", "amber", "violet", "indigo", "teal", "minty", "silky", "velvet",
  "crystal", "diamond", "rainbow", "thunder", "eager", "curious", "nimble", "loyal", "joyful", "hopeful",
] as const;

/** Second words of a student username. */
export const STUDENT_USERNAME_NOUNS = [
  "tiger", "panda", "koala", "eagle", "dolphin", "rabbit", "lion", "owl", "fox", "bear",
  "zebra", "giraffe", "elephant", "turtle", "penguin", "parrot", "falcon", "otter", "whale", "shark",
  "octopus", "seal", "bee", "ladybug", "firefly", "hamster", "kitten", "pony", "horse", "deer",
  "moose", "camel", "llama", "alpaca", "wolf", "lynx", "jaguar", "leopard", "cheetah", "panther",
  "swan", "robin", "sparrow", "hawk", "heron", "pelican", "kiwi", "puffin", "walrus", "toucan",
  "mango", "apple", "banana", "durian", "pomelo", "lychee", "guava", "tamarind", "papaya", "lotus",
  "orchid", "bamboo", "tulip", "maple", "cactus", "acorn", "star", "moon", "comet", "rocket",
  "planet", "galaxy", "river", "cloud", "ocean", "forest", "island", "meadow", "breeze", "pebble",
  "volcano", "canyon", "glacier", "robot", "kite", "drum", "piano", "guitar", "violin", "castle",
  "dragon", "griffin", "wizard", "sailor", "pirate", "ninja", "captain", "hero", "cookie", "pancake",
] as const;

/** The two digits at the end: 10 to 99 without 69 and 88, which carry a crude or a hate meaning. */
export const STUDENT_USERNAME_NUMBERS = Array.from({ length: 90 }, (_, i) => i + 10).filter((n) => n !== 69 && n !== 88);

const STUDENT_USERNAME_PATTERN = new RegExp(
  `^(${STUDENT_USERNAME_ADJECTIVES.join("|")})(${STUDENT_USERNAME_NOUNS.join("|")})(${STUDENT_USERNAME_NUMBERS.join("|")})$`,
);

/**
 * Makes a random student username of two words and two digits. The caller checks that it is free.
 * @param pick Returns a random integer below the given bound. Tests replace it.
 * @returns A lower-case username, for example `bluetiger47`.
 */
export function generateStudentUsername(pick: (max: number) => number = randomInt): string {
  const adjective = STUDENT_USERNAME_ADJECTIVES[pick(STUDENT_USERNAME_ADJECTIVES.length)];
  const noun = STUDENT_USERNAME_NOUNS[pick(STUDENT_USERNAME_NOUNS.length)];
  return `${adjective}${noun}${STUDENT_USERNAME_NUMBERS[pick(STUDENT_USERNAME_NUMBERS.length)]}`;
}

/**
 * Tells whether a username follows the student username rule.
 * @param username The username to test.
 * @returns True for a name such as `bluetiger47`; false for an email or a class-based name.
 */
export function isStudentUsername(username: string): boolean {
  return STUDENT_USERNAME_PATTERN.test(username);
}
