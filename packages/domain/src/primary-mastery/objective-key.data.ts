/**
 * The Primary objective key: every objective short id the Workbooks lesson packages use, with its
 * GSE node (track primary_objective_tags_20261006, FR-1). Generated from
 * `~/Desktop/Workbooks/docs/content-plans/data/{a0,a1,a2}-objective-key.json` (Workbooks commit
 * 6c84d1a; A0 GSE 10-21, A1 GSE 22-29, A2 GSE 30-42) and the graph releases of
 * `content/primary/tags.json`. Do not edit by hand; regenerate from the key files. The
 * child-language titles (`titleEn`, `titleTh`, `exampleEn`) are filled by the Workbooks authors when
 * they exist (program decision 10).
 */
import type { GraphRelease, ObjectiveKeyEntry } from "./contracts.js";

/** The graph releases the key and the tags were authored against. */
export const GRAPH_RELEASE: GraphRelease = {
  "gse": {
    "file": "mastery-advantage/english/gse-knowledge-space.json",
    "commit": "7344a27",
    "schemaVersion": "v1"
  },
  "vocabulary": {
    "file": "mastery-advantage/english/cefr-vocabulary/cefr-vocabulary-knowledge-space.json",
    "commit": "1e10cf9",
    "schemaVersion": "english-vocabulary.v1"
  }
};

/** The objective key, one entry per short id, in GSE order. */
export const OBJECTIVE_KEY: readonly ObjectiveKeyEntry[] = [
  {
    "shortId": "L10.1",
    "nodeId": "english.gse.skill.young.listening.10.can-hear-the-initial-sound-in-simple-wor",
    "gse": 10,
    "skill": "Listening",
    "text": "Can hear the initial sound in simple words."
  },
  {
    "shortId": "L10.2",
    "nodeId": "english.gse.skill.young.listening.10.can-recognise-cardinal-numbers-up-to-10",
    "gse": 10,
    "skill": "Listening",
    "text": "Can recognise cardinal numbers up to 10 in short phrases and sentences spoken slowly and clearly."
  },
  {
    "shortId": "L10.3",
    "nodeId": "english.gse.skill.young.listening.10.can-recognise-the-letters-of-the-alphabe",
    "gse": 10,
    "skill": "Listening",
    "text": "Can recognise the letters of the alphabet by their sounds."
  },
  {
    "shortId": "L10.4",
    "nodeId": "english.gse.skill.young.listening.10.can-respond-to-a-request-for-a-simple-ev",
    "gse": 10,
    "skill": "Listening",
    "text": "Can respond to a request for a simple evaluation with a gesture (e.g. ‘thumbs up’)."
  },
  {
    "shortId": "L10.5",
    "nodeId": "english.gse.skill.young.listening.10.can-understand-the-letters-of-the-alphab",
    "gse": 10,
    "skill": "Listening",
    "text": "Can understand the letters of the alphabet by their names."
  },
  {
    "shortId": "L10.6",
    "nodeId": "english.gse.skill.young.listening.10.can-recognise-a-few-familiar-everyday-no",
    "gse": 10,
    "skill": "Listening",
    "text": "Can recognise a few familiar everyday nouns and adjectives (e.g. ‘colours’, ‘numbers’, ‘classroom objects’), if spoken slowly and clearly."
  },
  {
    "shortId": "R10.1",
    "nodeId": "english.gse.skill.young.reading.10.can-identify-some-known-letters-in-words",
    "gse": 10,
    "skill": "Reading",
    "text": "Can identify some known letters in words."
  },
  {
    "shortId": "R10.2",
    "nodeId": "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark",
    "gse": 10,
    "skill": "Reading",
    "text": "Can recognise the use of a question mark to signal a question."
  },
  {
    "shortId": "R10.3",
    "nodeId": "english.gse.skill.young.reading.10.can-recognise-the-letters-of-the-alphabe",
    "gse": 10,
    "skill": "Reading",
    "text": "Can recognise the letters of the alphabet in upper and lower case."
  },
  {
    "shortId": "L11.1",
    "nodeId": "english.gse.skill.young.listening.11.can-understand-some-basic-words-and-phra",
    "gse": 11,
    "skill": "Listening",
    "text": "Can understand some basic words and phrases to show politeness (e.g. ‘Please’, ‘Thank you’, ‘Excuse me’, ‘Sorry’)."
  },
  {
    "shortId": "L12.1",
    "nodeId": "english.gse.skill.young.listening.12.can-understand-a-simple-evaluation-eg-ye",
    "gse": 12,
    "skill": "Listening",
    "text": "Can understand a simple evaluation (e.g. ‘yes/no’, ‘good/bad’)."
  },
  {
    "shortId": "R12.1",
    "nodeId": "english.gse.skill.young.reading.12.can-read-cardinal-numbers-up-to-ten-writ",
    "gse": 12,
    "skill": "Reading",
    "text": "Can read cardinal numbers up to ten written as words."
  },
  {
    "shortId": "L13.1",
    "nodeId": "english.gse.skill.young.listening.13.can-follow-short-basic-classroom-instruc",
    "gse": 13,
    "skill": "Listening",
    "text": "Can follow short, basic classroom instructions, if supported by pictures or gestures."
  },
  {
    "shortId": "L13.2",
    "nodeId": "english.gse.skill.young.listening.13.can-understand-basic-expressions-for-gre",
    "gse": 13,
    "skill": "Listening",
    "text": "Can understand basic expressions for greeting and leave-taking, if supported by gestures."
  },
  {
    "shortId": "R13.1",
    "nodeId": "english.gse.skill.young.reading.13.can-point-to-the-title-of-a-book-on-a-co",
    "gse": 13,
    "skill": "Reading",
    "text": "Can point to the title of a book on a cover."
  },
  {
    "shortId": "R13.2",
    "nodeId": "english.gse.skill.young.reading.13.can-recognise-cardinal-numbers-up-to-ten",
    "gse": 13,
    "skill": "Reading",
    "text": "Can recognise cardinal numbers up to ten when written as words in short texts."
  },
  {
    "shortId": "R14.1",
    "nodeId": "english.gse.skill.young.reading.14.can-read-a-text-in-the-correct-direction",
    "gse": 14,
    "skill": "Reading",
    "text": "Can read a text in the correct direction, from left to right and from the top of the page to the bottom."
  },
  {
    "shortId": "R14.2",
    "nodeId": "english.gse.skill.young.reading.14.can-identify-the-initial-sound-in-simple",
    "gse": 14,
    "skill": "Reading",
    "text": "Can identify the initial sound in simple words."
  },
  {
    "shortId": "L15.1",
    "nodeId": "english.gse.skill.young.listening.15.can-understand-basic-action-words-eg-cla",
    "gse": 15,
    "skill": "Listening",
    "text": "Can understand basic action words (e.g. ‘clap’, ‘stamp’, ‘jump’, ‘walk’)."
  },
  {
    "shortId": "R15.1",
    "nodeId": "english.gse.skill.young.reading.15.can-recognise-some-words-that-are-simila",
    "gse": 15,
    "skill": "Reading",
    "text": "Can recognise some words that are similar in their first language."
  },
  {
    "shortId": "L16.1",
    "nodeId": "english.gse.skill.young.listening.16.can-recognise-isolated-words-related-to",
    "gse": 16,
    "skill": "Listening",
    "text": "Can recognise isolated words related to familiar topics, if spoken slowly and clearly and supported by pictures or gestures."
  },
  {
    "shortId": "L16.2",
    "nodeId": "english.gse.skill.young.listening.16.can-understand-simple-negative-instructi",
    "gse": 16,
    "skill": "Listening",
    "text": "Can understand simple negative instructions related to everyday situations (e.g. ‘Don’t run’), if supported by gestures."
  },
  {
    "shortId": "L16.3",
    "nodeId": "english.gse.skill.young.listening.16.can-hear-the-individual-vowel-and-conson",
    "gse": 16,
    "skill": "Listening",
    "text": "Can hear the individual vowel and consonant sounds in simple words, if supported by pictures."
  },
  {
    "shortId": "L17.1",
    "nodeId": "english.gse.skill.young.listening.17.can-recognise-familiar-expressions-used",
    "gse": 17,
    "skill": "Listening",
    "text": "Can recognise familiar expressions used to signal the beginning and end of activities in the classroom."
  },
  {
    "shortId": "R17.1",
    "nodeId": "english.gse.skill.young.reading.17.can-understand-basic-sentences-introduci",
    "gse": 17,
    "skill": "Reading",
    "text": "Can understand basic sentences introducing someone (e.g. ‘name’, ‘age’)."
  },
  {
    "shortId": "R17.2",
    "nodeId": "english.gse.skill.young.reading.17.can-recognise-a-range-of-basic-everyday",
    "gse": 17,
    "skill": "Reading",
    "text": "Can recognise a range of basic everyday nouns and adjectives (e.g. ‘colours’, ‘numbers’, ‘classroom objects’)."
  },
  {
    "shortId": "L18.1",
    "nodeId": "english.gse.skill.young.listening.18.can-understand-a-few-basic-words-and-phr",
    "gse": 18,
    "skill": "Listening",
    "text": "Can understand a few basic words and phrases in a story that is read aloud to them."
  },
  {
    "shortId": "L18.2",
    "nodeId": "english.gse.skill.young.listening.18.can-recognise-familiar-words-and-phrases",
    "gse": 18,
    "skill": "Listening",
    "text": "Can recognise familiar words and phrases in short, simple songs or chants."
  },
  {
    "shortId": "L18.3",
    "nodeId": "english.gse.skill.young.listening.18.can-understand-simple-spoken-commands-as",
    "gse": 18,
    "skill": "Listening",
    "text": "Can understand simple spoken commands as part of a game."
  },
  {
    "shortId": "L18.4",
    "nodeId": "english.gse.skill.young.listening.18.can-understand-the-time-of-day-when-expr",
    "gse": 18,
    "skill": "Listening",
    "text": "Can understand the time of day when expressed in full hours."
  },
  {
    "shortId": "R18.1",
    "nodeId": "english.gse.skill.young.reading.18.can-combine-single-letter-sounds-to-read",
    "gse": 18,
    "skill": "Reading",
    "text": "Can combine single letter sounds to read simple words."
  },
  {
    "shortId": "R18.2",
    "nodeId": "english.gse.skill.young.reading.18.can-recognise-cardinal-numbers-up-to-50",
    "gse": 18,
    "skill": "Reading",
    "text": "Can recognise cardinal numbers up to 50 written as words."
  },
  {
    "shortId": "R18.3",
    "nodeId": "english.gse.skill.young.reading.18.can-recognise-different-basic-words-or-p",
    "gse": 18,
    "skill": "Reading",
    "text": "Can recognise different basic words or phrases used for a similar purpose (e.g. ‘hi’ / ‘hello’) to greet someone."
  },
  {
    "shortId": "L19.1",
    "nodeId": "english.gse.skill.young.listening.19.can-understand-the-main-information-when",
    "gse": 19,
    "skill": "Listening",
    "text": "Can understand the main information when people introduce themselves (e.g. ‘name’, ‘age’, ‘where they are from’)."
  },
  {
    "shortId": "L19.2",
    "nodeId": "english.gse.skill.young.listening.19.can-identify-everyday-objects-people-or",
    "gse": 19,
    "skill": "Listening",
    "text": "Can identify everyday objects, people or animals in their immediate surroundings or in pictures from short, basic descriptions (e.g. ‘colour’, ‘size’), if spoken slowly and clearly."
  },
  {
    "shortId": "L19.3",
    "nodeId": "english.gse.skill.young.listening.19.can-follow-basic-instructions-to-colour",
    "gse": 19,
    "skill": "Listening",
    "text": "Can follow basic instructions to colour, draw or make something."
  },
  {
    "shortId": "L19.4",
    "nodeId": "english.gse.skill.young.listening.19.can-recognise-familiar-words-in-short-ph",
    "gse": 19,
    "skill": "Listening",
    "text": "Can recognise familiar words in short phrases and sentences spoken slowly and clearly, if supported by pictures or gestures."
  },
  {
    "shortId": "R19.1",
    "nodeId": "english.gse.skill.young.reading.19.can-understand-basic-time-words-eg-days",
    "gse": 19,
    "skill": "Reading",
    "text": "Can understand basic time words e.g. ‘days of the week’, ‘months of the year.’"
  },
  {
    "shortId": "R19.2",
    "nodeId": "english.gse.skill.young.reading.19.can-recognise-familiar-names-words-and-v",
    "gse": 19,
    "skill": "Reading",
    "text": "Can recognise familiar names, words and very basic phrases on simple notices and signs."
  },
  {
    "shortId": "L20.1",
    "nodeId": "english.gse.skill.young.listening.20.can-understand-simple-questions-about-pe",
    "gse": 20,
    "skill": "Listening",
    "text": "Can understand simple questions about personal information (e.g. ‘name’ or ‘age’) if spoken slowly and clearly."
  },
  {
    "shortId": "L20.2",
    "nodeId": "english.gse.skill.young.listening.20.can-understand-short-simple-instructions",
    "gse": 20,
    "skill": "Listening",
    "text": "Can understand short, simple instructions addressed slowly and clearly."
  },
  {
    "shortId": "R20.1",
    "nodeId": "english.gse.skill.young.reading.20.can-demonstrate-understanding-of-a-word",
    "gse": 20,
    "skill": "Reading",
    "text": "Can demonstrate understanding of a word by matching it to a picture."
  },
  {
    "shortId": "R20.2",
    "nodeId": "english.gse.skill.young.reading.20.can-recognise-basic-plural-forms-of-comm",
    "gse": 20,
    "skill": "Reading",
    "text": "Can recognise basic plural forms of common nouns (e.g. ‘cars’, ‘books’)."
  },
  {
    "shortId": "R20.3",
    "nodeId": "english.gse.skill.young.reading.20.can-understand-some-simple-everyday-sign",
    "gse": 20,
    "skill": "Reading",
    "text": "Can understand some simple, everyday signs (e.g. ‘car park’, ‘station’, ‘bathroom’)."
  },
  {
    "shortId": "R20.4",
    "nodeId": "english.gse.skill.young.reading.20.can-understand-very-short-simple-instruc",
    "gse": 20,
    "skill": "Reading",
    "text": "Can understand very short, simple, instructions on everyday signs (e.g. ‘No parking’, ‘No food or drink’)."
  },
  {
    "shortId": "L21.1",
    "nodeId": "english.gse.skill.young.listening.21.can-understand-simple-language-related-t",
    "gse": 21,
    "skill": "Listening",
    "text": "Can understand simple language related to naming and describing family members."
  },
  {
    "shortId": "L21.2",
    "nodeId": "english.gse.skill.young.listening.21.can-understand-simple-questions-asking-f",
    "gse": 21,
    "skill": "Listening",
    "text": "Can understand simple questions asking for basic information about objects in their immediate surroundings or in pictures (e.g. ‘colour’, ‘size’), if addressed slowly and clearly."
  },
  {
    "shortId": "L21.3",
    "nodeId": "english.gse.skill.young.listening.21.can-get-the-gist-of-a-simple-song-if-sup",
    "gse": 21,
    "skill": "Listening",
    "text": "Can get the gist of a simple song, if supported by gestures."
  },
  {
    "shortId": "R21.1",
    "nodeId": "english.gse.skill.young.reading.21.can-recognise-some-frequent-everyday-wor",
    "gse": 21,
    "skill": "Reading",
    "text": "Can recognise some frequent everyday words."
  },
  {
    "shortId": "R21.2",
    "nodeId": "english.gse.skill.young.reading.21.can-recognise-basic-action-words-eg-clap",
    "gse": 21,
    "skill": "Reading",
    "text": "Can recognise basic action words (e.g. ‘clap’, ‘stamp’, ‘jump’, ‘walk’)."
  },
  {
    "shortId": "R21.3",
    "nodeId": "english.gse.skill.young.reading.21.can-identify-the-individual-vowel-and-co",
    "gse": 21,
    "skill": "Reading",
    "text": "Can identify the individual vowel and consonant sounds in simple words, if supported by pictures."
  },
  {
    "shortId": "R21.4",
    "nodeId": "english.gse.skill.young.reading.21.can-recognise-single-familiar-everyday-w",
    "gse": 21,
    "skill": "Reading",
    "text": "Can recognise single, familiar everyday words if supported by pictures."
  },
  {
    "shortId": "L22.1",
    "nodeId": "english.gse.skill.young.listening.22.can-understand-basic-questions-about-wha",
    "gse": 22,
    "skill": "Listening",
    "text": "Can understand basic questions about what things are in their immediate surroundings or in pictures (e.g. ‘What’s this?’)."
  },
  {
    "shortId": "L22.2",
    "nodeId": "english.gse.skill.young.listening.22.can-recognise-basic-time-words-eg-days-m",
    "gse": 22,
    "skill": "Listening",
    "text": "Can recognise basic time words (e.g. ‘days’, ‘months’) in simple phrases or sentences."
  },
  {
    "shortId": "R22.1",
    "nodeId": "english.gse.skill.young.reading.22.can-recognise-some-familiar-words-relate",
    "gse": 22,
    "skill": "Reading",
    "text": "Can recognise some familiar words related to themselves and their family (e.g. ‘girl’, ‘brother’)."
  },
  {
    "shortId": "R22.2",
    "nodeId": "english.gse.skill.young.reading.22.can-recognise-ordinal-numbers-up-to-20-w",
    "gse": 22,
    "skill": "Reading",
    "text": "Can recognise ordinal numbers up to 20 written as words."
  },
  {
    "shortId": "R22.3",
    "nodeId": "english.gse.skill.young.reading.22.can-understand-simple-contractions-eg-im",
    "gse": 22,
    "skill": "Reading",
    "text": "Can understand simple contractions (e.g. ‘I’m’, ‘he’s’, ‘we’re’)."
  },
  {
    "shortId": "L23.1",
    "nodeId": "english.gse.skill.young.listening.23.can-distinguish-between-can-and-cant-p",
    "gse": 23,
    "skill": "Listening",
    "text": "Can distinguish between ‘can’ and ‘can’t’."
  },
  {
    "shortId": "L23.2",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-the-time-of-day-when-expr",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand the time of day when expressed to the quarter hour."
  },
  {
    "shortId": "L23.3",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-simple-phrases-about-like",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand simple phrases about likes and dislikes."
  },
  {
    "shortId": "L23.4",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-short-simple-questions-re",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand short, simple questions related to basic personal information, if spoken slowly and clearly."
  },
  {
    "shortId": "L23.5",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-simple-feedback-from-a-te",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand simple feedback from a teacher."
  },
  {
    "shortId": "L23.6",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-simple-contractions-eg-im",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand simple contractions (e.g. ‘I’m’, ‘he’s’, ‘we’re’)."
  },
  {
    "shortId": "L23.7",
    "nodeId": "english.gse.skill.young.listening.23.can-understand-the-time-of-day-when-expr.1",
    "gse": 23,
    "skill": "Listening",
    "text": "Can understand the time of day when expressed to within five minutes."
  },
  {
    "shortId": "R23.1",
    "nodeId": "english.gse.skill.young.reading.23.can-read-sentences-correctly-from-left-t",
    "gse": 23,
    "skill": "Reading",
    "text": "Can read sentences correctly from left to right."
  },
  {
    "shortId": "R23.2",
    "nodeId": "english.gse.skill.young.reading.23.can-understand-basic-written-instruction",
    "gse": 23,
    "skill": "Reading",
    "text": "Can understand basic written instructions for classroom activities (e.g. ‘Read and match’)."
  },
  {
    "shortId": "R23.3",
    "nodeId": "english.gse.skill.young.reading.23.can-identify-familiar-words-in-short-sim",
    "gse": 23,
    "skill": "Reading",
    "text": "Can identify familiar words in short, simple texts."
  },
  {
    "shortId": "R23.4",
    "nodeId": "english.gse.skill.young.reading.23.can-recognise-cardinal-numbers-up-to-100",
    "gse": 23,
    "skill": "Reading",
    "text": "Can recognise cardinal numbers up to 100 written as words."
  },
  {
    "shortId": "R23.5",
    "nodeId": "english.gse.skill.young.reading.23.can-understand-the-relationship-between",
    "gse": 23,
    "skill": "Reading",
    "text": "Can understand the relationship between words from the same vocabulary set (e.g. ‘colours’, ‘foods’, ‘classroom objects’)."
  },
  {
    "shortId": "R23.6",
    "nodeId": "english.gse.skill.young.reading.23.can-understand-short-simple-descriptions",
    "gse": 23,
    "skill": "Reading",
    "text": "Can understand short, simple descriptions of familiar places, if supported by pictures."
  },
  {
    "shortId": "R23.7",
    "nodeId": "english.gse.skill.young.reading.23.can-guess-the-meaning-of-a-word-from-an",
    "gse": 23,
    "skill": "Reading",
    "text": "Can guess the meaning of a word from an accompanying picture."
  },
  {
    "shortId": "R23.8",
    "nodeId": "english.gse.skill.young.reading.23.can-recognise-simple-words-and-phrases-r",
    "gse": 23,
    "skill": "Reading",
    "text": "Can recognise simple words and phrases related to familiar topics if supported by pictures."
  },
  {
    "shortId": "L24.1",
    "nodeId": "english.gse.skill.young.listening.24.can-recognise-familiar-key-words-and-phr",
    "gse": 24,
    "skill": "Listening",
    "text": "Can recognise familiar key words and phrases in short, basic descriptions (e.g. of ‘objects’, ‘people’ or ‘animals’), if spoken slowly and clearly."
  },
  {
    "shortId": "L24.2",
    "nodeId": "english.gse.skill.young.listening.24.can-recognise-familiar-words-and-basic-p",
    "gse": 24,
    "skill": "Listening",
    "text": "Can recognise familiar words and basic phrases in short illustrated stories, if read out slowly and clearly."
  },
  {
    "shortId": "L24.3",
    "nodeId": "english.gse.skill.young.listening.24.can-understand-basic-phrases-or-sentence",
    "gse": 24,
    "skill": "Listening",
    "text": "Can understand basic phrases or sentences about things people have if supported by pictures."
  },
  {
    "shortId": "L24.4",
    "nodeId": "english.gse.skill.young.listening.24.can-understand-basic-statements-about-wh",
    "gse": 24,
    "skill": "Listening",
    "text": "Can understand basic statements about where things or people are, if spoken slowly and clearly and supported by pictures or gestures."
  },
  {
    "shortId": "L24.5",
    "nodeId": "english.gse.skill.young.listening.24.can-understand-basic-phrases-about-the-w",
    "gse": 24,
    "skill": "Listening",
    "text": "Can understand basic phrases about the weather, if spoken slowly and clearly."
  },
  {
    "shortId": "L24.6",
    "nodeId": "english.gse.skill.young.listening.24.can-recognise-ordinal-numbers-up-to-50-i",
    "gse": 24,
    "skill": "Listening",
    "text": "Can recognise ordinal numbers up to 50, if spoken slowly and clearly."
  },
  {
    "shortId": "R24.1",
    "nodeId": "english.gse.skill.young.reading.24.can-use-knowledge-of-alphabetical-order",
    "gse": 24,
    "skill": "Reading",
    "text": "Can use knowledge of alphabetical order to find words in a dictionary."
  },
  {
    "shortId": "R24.2",
    "nodeId": "english.gse.skill.young.reading.24.can-understand-basic-sentences-naming-fa",
    "gse": 24,
    "skill": "Reading",
    "text": "Can understand basic sentences naming familiar everyday items, if supported by pictures."
  },
  {
    "shortId": "R24.3",
    "nodeId": "english.gse.skill.young.reading.24.can-understand-simple-sentences-given-pr",
    "gse": 24,
    "skill": "Reading",
    "text": "Can understand simple sentences, given prompts."
  },
  {
    "shortId": "R24.4",
    "nodeId": "english.gse.skill.young.reading.24.can-recognise-key-words-and-basic-phrase",
    "gse": 24,
    "skill": "Reading",
    "text": "Can recognise key words and basic phrases in short, simple cartoon stories."
  },
  {
    "shortId": "R24.5",
    "nodeId": "english.gse.skill.young.reading.24.can-find-proper-names-eg-people-places-n",
    "gse": 24,
    "skill": "Reading",
    "text": "Can find proper names (e.g. ‘people’, ‘places’, ‘nationalities’) in short, simple texts by looking for capital letters."
  },
  {
    "shortId": "R24.6",
    "nodeId": "english.gse.skill.young.reading.24.can-understand-basic-phrases-in-short-si",
    "gse": 24,
    "skill": "Reading",
    "text": "Can understand basic phrases in short, simple texts."
  },
  {
    "shortId": "L25.1",
    "nodeId": "english.gse.skill.young.listening.25.can-understand-basic-questions-about-per",
    "gse": 25,
    "skill": "Listening",
    "text": "Can understand basic questions about personal details if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L25.2",
    "nodeId": "english.gse.skill.young.listening.25.can-understand-simple-directions-if-spok",
    "gse": 25,
    "skill": "Listening",
    "text": "Can understand simple directions, if spoken slowly and clearly."
  },
  {
    "shortId": "L25.3",
    "nodeId": "english.gse.skill.young.listening.25.can-recognise-words-and-simple-phrases-r",
    "gse": 25,
    "skill": "Listening",
    "text": "Can recognise words and simple phrases related to familiar topics, if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L25.4",
    "nodeId": "english.gse.skill.young.listening.25.can-get-the-gist-of-short-simple-stories",
    "gse": 25,
    "skill": "Listening",
    "text": "Can get the gist of short, simple stories, if told slowly and clearly and supported by pictures or gestures."
  },
  {
    "shortId": "L25.5",
    "nodeId": "english.gse.skill.young.listening.25.can-understand-the-time-of-day-when-expr",
    "gse": 25,
    "skill": "Listening",
    "text": "Can understand the time of day when expressed to the half hour."
  },
  {
    "shortId": "L25.6",
    "nodeId": "english.gse.skill.young.listening.25.can-understand-basic-expressions-or-ques",
    "gse": 25,
    "skill": "Listening",
    "text": "Can understand basic expressions or questions related to immediate personal needs, if delivered slowly and clearly."
  },
  {
    "shortId": "R25.1",
    "nodeId": "english.gse.skill.young.reading.25.can-recognise-words-or-phrases-that-are",
    "gse": 25,
    "skill": "Reading",
    "text": "Can recognise words or phrases that are repeated in a short text or poem."
  },
  {
    "shortId": "R25.2",
    "nodeId": "english.gse.skill.young.reading.25.can-understand-a-simple-text-if-supporte",
    "gse": 25,
    "skill": "Reading",
    "text": "Can understand a simple text if supported by pictures."
  },
  {
    "shortId": "R25.3",
    "nodeId": "english.gse.skill.young.reading.25.can-understand-a-few-simple-phrases-rela",
    "gse": 25,
    "skill": "Reading",
    "text": "Can understand a few simple phrases related to familiar, everyday activities."
  },
  {
    "shortId": "R25.4",
    "nodeId": "english.gse.skill.young.reading.25.can-distinguish-between-a-negative-state",
    "gse": 25,
    "skill": "Reading",
    "text": "Can distinguish between a negative statement and a positive statement."
  },
  {
    "shortId": "R25.5",
    "nodeId": "english.gse.skill.young.reading.25.can-understand-simple-sentences-about-th",
    "gse": 25,
    "skill": "Reading",
    "text": "Can understand simple sentences about the weather, if supported by pictures."
  },
  {
    "shortId": "R25.6",
    "nodeId": "english.gse.skill.young.reading.25.can-identify-individual-sounds-within-si",
    "gse": 25,
    "skill": "Reading",
    "text": "Can identify individual sounds within simple words."
  },
  {
    "shortId": "L26.1",
    "nodeId": "english.gse.skill.young.listening.26.can-identify-the-day-and-date-in-short-s",
    "gse": 26,
    "skill": "Listening",
    "text": "Can identify the day and date in short, simple dialogues, if spoken slowly and clearly and supported by pictures or gestures."
  },
  {
    "shortId": "L26.2",
    "nodeId": "english.gse.skill.young.listening.26.can-understand-basic-information-about-s",
    "gse": 26,
    "skill": "Listening",
    "text": "Can understand basic information about someone’s immediate family, if spoken slowly and clearly and supported by pictures or gestures."
  },
  {
    "shortId": "L26.3",
    "nodeId": "english.gse.skill.young.listening.26.can-understand-simple-language-related-t",
    "gse": 26,
    "skill": "Listening",
    "text": "Can understand simple language related to naming and describing people’s clothes."
  },
  {
    "shortId": "L26.4",
    "nodeId": "english.gse.skill.young.listening.26.can-identify-a-callers-name-and-phone-nu",
    "gse": 26,
    "skill": "Listening",
    "text": "Can identify a caller’s name and phone number from a short, simple telephone conversation."
  },
  {
    "shortId": "R26.1",
    "nodeId": "english.gse.skill.young.reading.26.can-identify-repeated-words-or-phrases-i",
    "gse": 26,
    "skill": "Reading",
    "text": "Can identify repeated words or phrases in a short text."
  },
  {
    "shortId": "R26.2",
    "nodeId": "english.gse.skill.young.reading.26.can-understand-basic-sentences-describin",
    "gse": 26,
    "skill": "Reading",
    "text": "Can understand basic sentences describing someone’s physical appearance, (e.g. ‘eye/hair colour’, ‘height’), if supported by pictures."
  },
  {
    "shortId": "R26.3",
    "nodeId": "english.gse.skill.young.reading.26.can-understand-basic-sentences-about-thi",
    "gse": 26,
    "skill": "Reading",
    "text": "Can understand basic sentences about things people have, if supported by pictures."
  },
  {
    "shortId": "R26.4",
    "nodeId": "english.gse.skill.young.reading.26.can-link-letters-and-sounds-when-reading",
    "gse": 26,
    "skill": "Reading",
    "text": "Can link letters and sounds when reading words."
  },
  {
    "shortId": "R26.5",
    "nodeId": "english.gse.skill.young.reading.26.can-follow-simple-dialogues-in-short-ill",
    "gse": 26,
    "skill": "Reading",
    "text": "Can follow simple dialogues in short illustrated stories, if they can listen while reading."
  },
  {
    "shortId": "R26.6",
    "nodeId": "english.gse.skill.young.reading.26.can-understand-basic-information-about-p",
    "gse": 26,
    "skill": "Reading",
    "text": "Can understand basic information about people’s likes and dislikes, if supported by pictures."
  },
  {
    "shortId": "L27.1",
    "nodeId": "english.gse.skill.young.listening.27.can-understand-straightforward-instructi",
    "gse": 27,
    "skill": "Listening",
    "text": "Can understand straightforward instructions, if spoken slowly and clearly."
  },
  {
    "shortId": "L27.2",
    "nodeId": "english.gse.skill.young.listening.27.can-recognise-words-or-phrases-that-are",
    "gse": 27,
    "skill": "Listening",
    "text": "Can recognise words or phrases that are repeated in a short dialogue or poem."
  },
  {
    "shortId": "L27.3",
    "nodeId": "english.gse.skill.young.listening.27.can-understand-simple-phrases-related-to",
    "gse": 27,
    "skill": "Listening",
    "text": "Can understand simple phrases related to familiar topics, if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L27.4",
    "nodeId": "english.gse.skill.young.listening.27.can-understand-simple-questions-and-answ",
    "gse": 27,
    "skill": "Listening",
    "text": "Can understand simple questions and answers about peoples likes and dislikes."
  },
  {
    "shortId": "L27.5",
    "nodeId": "english.gse.skill.young.listening.27.can-identify-the-names-of-people-or-plac",
    "gse": 27,
    "skill": "Listening",
    "text": "Can identify the names of people or places in short, simple dialogues, if spoken slowly and clearly."
  },
  {
    "shortId": "L27.6",
    "nodeId": "english.gse.skill.young.listening.27.can-identify-people-in-their-immediate-s",
    "gse": 27,
    "skill": "Listening",
    "text": "Can identify people in their immediate surroundings or in pictures from a short, simple description of their physical appearance and clothes."
  },
  {
    "shortId": "L27.7",
    "nodeId": "english.gse.skill.young.listening.27.can-recognise-key-information-eg-place-t",
    "gse": 27,
    "skill": "Listening",
    "text": "Can recognise key information (e.g. ‘place’, ‘time’) about everyday events, if spoken slowly and clearly."
  },
  {
    "shortId": "R27.1",
    "nodeId": "english.gse.skill.young.reading.27.can-follow-short-simple-written-directio",
    "gse": 27,
    "skill": "Reading",
    "text": "Can follow short, simple written directions (e.g. ‘go from X to Y’)."
  },
  {
    "shortId": "R27.2",
    "nodeId": "english.gse.skill.young.reading.27.can-guess-what-a-story-or-text-is-about",
    "gse": 27,
    "skill": "Reading",
    "text": "Can guess what a story or text is about from the pictures."
  },
  {
    "shortId": "R27.3",
    "nodeId": "english.gse.skill.young.reading.27.can-understand-short-simple-descriptions",
    "gse": 27,
    "skill": "Reading",
    "text": "Can understand short, simple descriptions of objects, people and animals if supported by pictures."
  },
  {
    "shortId": "R27.4",
    "nodeId": "english.gse.skill.young.reading.27.can-understand-the-information-in-a-simp",
    "gse": 27,
    "skill": "Reading",
    "text": "Can understand the information in a simple school timetable giving days and times of classes."
  },
  {
    "shortId": "R27.5",
    "nodeId": "english.gse.skill.young.reading.27.can-understand-basic-sentences-describin",
    "gse": 27,
    "skill": "Reading",
    "text": "Can understand basic sentences describing familiar everyday items (e.g. ‘colour’, ‘size’), if supported by pictures."
  },
  {
    "shortId": "R27.6",
    "nodeId": "english.gse.skill.young.reading.27.can-understand-simple-informational-mate",
    "gse": 27,
    "skill": "Reading",
    "text": "Can understand simple informational material containing familiar words, if supported by pictures (e.g. ‘a menu with pictures of food’)."
  },
  {
    "shortId": "R27.7",
    "nodeId": "english.gse.skill.young.reading.27.can-understand-basic-sentences-about-whe",
    "gse": 27,
    "skill": "Reading",
    "text": "Can understand basic sentences about where things, animals or people are."
  },
  {
    "shortId": "L28.1",
    "nodeId": "english.gse.skill.young.listening.28.can-identify-common-objects-from-descrip",
    "gse": 28,
    "skill": "Listening",
    "text": "Can identify common objects from descriptions, if spoken slowly and clearly."
  },
  {
    "shortId": "L28.2",
    "nodeId": "english.gse.skill.young.listening.28.can-understand-simple-sentences-on-famil",
    "gse": 28,
    "skill": "Listening",
    "text": "Can understand simple sentences on familiar topics if spoken slowly and clearly and with pauses."
  },
  {
    "shortId": "L28.3",
    "nodeId": "english.gse.skill.young.listening.28.can-understand-what-people-say-they-can",
    "gse": 28,
    "skill": "Listening",
    "text": "Can understand what people say they can or can’t do from simple sentences spoken slowly and clearly."
  },
  {
    "shortId": "L28.4",
    "nodeId": "english.gse.skill.young.listening.28.can-follow-a-short-familiar-traditional",
    "gse": 28,
    "skill": "Listening",
    "text": "Can follow a short, familiar traditional story, if supported by gestures and repetition."
  },
  {
    "shortId": "R28.1",
    "nodeId": "english.gse.skill.young.reading.28.can-recognise-familiar-words-on-product",
    "gse": 28,
    "skill": "Reading",
    "text": "Can recognise familiar words on product labels."
  },
  {
    "shortId": "R28.2",
    "nodeId": "english.gse.skill.young.reading.28.can-get-the-gist-of-a-very-simple-illust",
    "gse": 28,
    "skill": "Reading",
    "text": "Can get the gist of a very simple illustrated story."
  },
  {
    "shortId": "R28.3",
    "nodeId": "english.gse.skill.young.reading.28.can-read-the-time-when-written-as-words",
    "gse": 28,
    "skill": "Reading",
    "text": "Can read the time when written as words."
  },
  {
    "shortId": "R28.4",
    "nodeId": "english.gse.skill.young.reading.28.can-follow-basic-instructions-for-making",
    "gse": 28,
    "skill": "Reading",
    "text": "Can follow basic instructions for making something (e.g. ‘a mask’, ‘a clock’), if supported by pictures."
  },
  {
    "shortId": "L29.1",
    "nodeId": "english.gse.skill.young.listening.29.can-understand-basic-information-in-shor",
    "gse": 29,
    "skill": "Listening",
    "text": "Can understand basic information in short passages about everyday activities or routines, if spoken slowly and clearly and supported by prompts."
  },
  {
    "shortId": "L29.2",
    "nodeId": "english.gse.skill.young.listening.29.can-understand-basic-information-about-p",
    "gse": 29,
    "skill": "Listening",
    "text": "Can understand basic information about prices, times, and dates in familiar contexts, if spoken slowly and clearly."
  },
  {
    "shortId": "R29.1",
    "nodeId": "english.gse.skill.young.reading.29.can-combine-a-range-of-letter-sounds-to",
    "gse": 29,
    "skill": "Reading",
    "text": "Can combine a range of letter sounds to read some common words (e.g. ‘sing’, ‘high’)."
  },
  {
    "shortId": "R29.2",
    "nodeId": "english.gse.skill.young.reading.29.can-guess-what-happens-next-in-a-story-f",
    "gse": 29,
    "skill": "Reading",
    "text": "Can guess what happens next in a story from the pictures."
  },
  {
    "shortId": "R29.3",
    "nodeId": "english.gse.skill.young.reading.29.can-infer-basic-information-about-a-char",
    "gse": 29,
    "skill": "Reading",
    "text": "Can infer basic information about a character’s preferences from pictures."
  },
  {
    "shortId": "R29.4",
    "nodeId": "english.gse.skill.young.reading.29.can-understand-short-simple-messages-abo",
    "gse": 29,
    "skill": "Reading",
    "text": "Can understand short, simple messages about when and where to meet."
  },
  {
    "shortId": "R29.5",
    "nodeId": "english.gse.skill.young.reading.29.can-understand-short-simple-illustrated",
    "gse": 29,
    "skill": "Reading",
    "text": "Can understand short, simple illustrated narratives about everyday activities."
  },
  {
    "shortId": "R29.6",
    "nodeId": "english.gse.skill.young.reading.29.can-recognise-ordinal-numbers-up-to-50-w",
    "gse": 29,
    "skill": "Reading",
    "text": "Can recognise ordinal numbers up to 50 written as words."
  },
  {
    "shortId": "R29.7",
    "nodeId": "english.gse.skill.young.reading.29.can-translate-simple-words-and-phrases-w",
    "gse": 29,
    "skill": "Reading",
    "text": "Can translate simple words and phrases with the help of a bilingual dictionary."
  },
  {
    "shortId": "R29.8",
    "nodeId": "english.gse.skill.young.reading.29.can-understand-basic-key-words-in-short",
    "gse": 29,
    "skill": "Reading",
    "text": "Can understand basic key words in short notes or messages."
  },
  {
    "shortId": "L30.1",
    "nodeId": "english.gse.skill.young.listening.30.can-identify-people-in-their-immediate-s",
    "gse": 30,
    "skill": "Listening",
    "text": "Can identify people in their immediate surroundings or in pictures from a short, simple description of where they are and what they are doing."
  },
  {
    "shortId": "L30.2",
    "nodeId": "english.gse.skill.young.listening.30.can-follow-an-animated-cartoon-of-a-fami",
    "gse": 30,
    "skill": "Listening",
    "text": "Can follow an animated cartoon of a familiar type, if provided with written support."
  },
  {
    "shortId": "L30.3",
    "nodeId": "english.gse.skill.young.listening.30.can-understand-basic-information-about-s",
    "gse": 30,
    "skill": "Listening",
    "text": "Can understand basic information about someone’s house or flat (e.g. ‘rooms’, ‘furniture’), if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "R30.1",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-some-details-in-short-sim",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand some details in short, simple dialogues on familiar everyday topics, if supported by pictures."
  },
  {
    "shortId": "R30.2",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-simple-information-on-eve",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand simple information on everyday signs in a public building."
  },
  {
    "shortId": "R30.3",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-the-main-idea-in-a-short",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand the main idea in a short, simple picture story."
  },
  {
    "shortId": "R30.4",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-basic-factual-statements",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand basic factual statements relating to pictures or simple texts."
  },
  {
    "shortId": "R30.5",
    "nodeId": "english.gse.skill.young.reading.30.can-identify-people-in-their-immediate-s",
    "gse": 30,
    "skill": "Reading",
    "text": "Can identify people in their immediate surroundings or in pictures from a short, simple description of their physical appearance and clothes."
  },
  {
    "shortId": "R30.6",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-a-short-simple-descriptio",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand a short, simple description of a house or flat (e.g. ‘rooms’, ‘furniture’), if supported by pictures."
  },
  {
    "shortId": "R30.7",
    "nodeId": "english.gse.skill.young.reading.30.can-understand-simple-feedback-from-a-te",
    "gse": 30,
    "skill": "Reading",
    "text": "Can understand simple feedback from a teacher or classmate."
  },
  {
    "shortId": "R30.8",
    "nodeId": "english.gse.skill.young.reading.30.can-identify-the-main-information-for-an",
    "gse": 30,
    "skill": "Reading",
    "text": "Can identify the main information for an event (e.g. ‘day’, ‘time, place’)."
  },
  {
    "shortId": "L31.1",
    "nodeId": "english.gse.skill.young.listening.31.can-follow-a-simple-conversation-between",
    "gse": 31,
    "skill": "Listening",
    "text": "Can follow a simple conversation between two people or characters, if supported by pictures."
  },
  {
    "shortId": "L31.10",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-a-simple-instruction-cont",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand a simple instruction containing a qualifying clause (e.g. ‘If your birthday is in March, stand here.’)"
  },
  {
    "shortId": "L31.11",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-the-main-information-in-s",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand the main information in short, simple dialogues about someone’s daily routines, if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L31.12",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-simple-expressions-about",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand simple expressions about likes and dislikes in short, simple stories or dialogues, if spoken slowly and clearly."
  },
  {
    "shortId": "L31.13",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-simple-comparisons-betwee",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand simple comparisons between objects or people, if spoken slowly and clearly."
  },
  {
    "shortId": "L31.2",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-some-unfamiliar-words-in",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand some unfamiliar words in a short description, if supported by pictures."
  },
  {
    "shortId": "L31.3",
    "nodeId": "english.gse.skill.young.listening.31.can-identify-objects-places-or-people-fr",
    "gse": 31,
    "skill": "Listening",
    "text": "Can identify objects, places or people from short descriptions."
  },
  {
    "shortId": "L31.4",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-basic-information-about-c",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand basic information about common jobs, if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L31.5",
    "nodeId": "english.gse.skill.young.listening.31.can-identify-key-information-eg-places-t",
    "gse": 31,
    "skill": "Listening",
    "text": "Can identify key information (e.g. ‘places’, ‘times’) from short audio recordings, if spoken slowly and clearly."
  },
  {
    "shortId": "L31.6",
    "nodeId": "english.gse.skill.young.listening.31.can-identify-how-much-something-costs-in",
    "gse": 31,
    "skill": "Listening",
    "text": "Can identify how much something costs in short, simple dialogues about the price of something e.g. ‘in a shop’, ‘if speech is slow and clear.’"
  },
  {
    "shortId": "L31.7",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-basic-personal-informatio",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand basic personal information in short, simple dialogues, if spoken slowly and clearly and guided by written prompts."
  },
  {
    "shortId": "L31.8",
    "nodeId": "english.gse.skill.young.listening.31.can-identify-simple-information-in-a-sho",
    "gse": 31,
    "skill": "Listening",
    "text": "Can identify simple information in a short video, provided that the visual supports this information and the delivery is slow and clear."
  },
  {
    "shortId": "L31.9",
    "nodeId": "english.gse.skill.young.listening.31.can-understand-how-people-are-feeling-if",
    "gse": 31,
    "skill": "Listening",
    "text": "Can understand how people are feeling if they use simple language and speak slowly and clearly."
  },
  {
    "shortId": "R31.1",
    "nodeId": "english.gse.skill.young.reading.31.can-identify-key-information-in-a-text-t",
    "gse": 31,
    "skill": "Reading",
    "text": "Can identify key information in a text to answer simple yes/no questions."
  },
  {
    "shortId": "R31.2",
    "nodeId": "english.gse.skill.young.reading.31.can-follow-a-simple-dialogue-about-famil",
    "gse": 31,
    "skill": "Reading",
    "text": "Can follow a simple dialogue about familiar, everyday activities."
  },
  {
    "shortId": "R31.3",
    "nodeId": "english.gse.skill.young.reading.31.can-follow-basic-instructions-on-how-to",
    "gse": 31,
    "skill": "Reading",
    "text": "Can follow basic instructions on how to play a simple board game, if supported by pictures."
  },
  {
    "shortId": "R31.4",
    "nodeId": "english.gse.skill.young.reading.31.can-understand-short-simple-descriptions",
    "gse": 31,
    "skill": "Reading",
    "text": "Can understand short, simple descriptions of someone’s typical day, if supported by pictures."
  },
  {
    "shortId": "R31.5",
    "nodeId": "english.gse.skill.young.reading.31.can-understand-and-make-connections-betw",
    "gse": 31,
    "skill": "Reading",
    "text": "Can understand and make connections between words in the same area of meaning, e.g. ‘head’ and ‘hat’."
  },
  {
    "shortId": "R31.6",
    "nodeId": "english.gse.skill.young.reading.31.can-follow-a-short-familiar-traditional",
    "gse": 31,
    "skill": "Reading",
    "text": "Can follow a short, familiar, traditional story, if supported by pictures."
  },
  {
    "shortId": "L32.1",
    "nodeId": "english.gse.skill.young.listening.32.can-identify-the-context-of-short-simple",
    "gse": 32,
    "skill": "Listening",
    "text": "Can identify the context of short, simple dialogues related to familiar everyday situations."
  },
  {
    "shortId": "R32.1",
    "nodeId": "english.gse.skill.young.reading.32.can-understand-simple-notes-p",
    "gse": 32,
    "skill": "Reading",
    "text": "Can understand simple notes."
  },
  {
    "shortId": "R32.2",
    "nodeId": "english.gse.skill.young.reading.32.can-understand-and-make-connections-betw",
    "gse": 32,
    "skill": "Reading",
    "text": "Can understand and make connections between words in the same area of meaning, e.g. ‘head’ and ‘hat’"
  },
  {
    "shortId": "R32.3",
    "nodeId": "english.gse.skill.young.reading.32.can-identify-the-number-of-syllables-in",
    "gse": 32,
    "skill": "Reading",
    "text": "Can identify the number of syllables in a word."
  },
  {
    "shortId": "R32.4",
    "nodeId": "english.gse.skill.young.reading.32.can-identify-key-buildings-on-a-plan-or",
    "gse": 32,
    "skill": "Reading",
    "text": "Can identify key buildings on a plan or key features on a map."
  },
  {
    "shortId": "R32.5",
    "nodeId": "english.gse.skill.young.reading.32.can-follow-the-sequence-of-events-in-sho",
    "gse": 32,
    "skill": "Reading",
    "text": "Can follow the sequence of events in short, simple cartoon stories that use familiar key words."
  },
  {
    "shortId": "R32.6",
    "nodeId": "english.gse.skill.young.reading.32.can-understand-a-simple-written-dialogue",
    "gse": 32,
    "skill": "Reading",
    "text": "Can understand a simple written dialogue on a familiar topic."
  },
  {
    "shortId": "R32.7",
    "nodeId": "english.gse.skill.young.reading.32.can-understand-everyday-written-signs-an",
    "gse": 32,
    "skill": "Reading",
    "text": "Can understand everyday written signs and notices found in public places (e.g. ‘rules’, ‘directions’), if supported by the context."
  },
  {
    "shortId": "R32.8",
    "nodeId": "english.gse.skill.young.reading.32.can-understand-some-simple-details-about",
    "gse": 32,
    "skill": "Reading",
    "text": "Can understand some simple details about a holiday from a postcard, if supported by pictures."
  },
  {
    "shortId": "L33.1",
    "nodeId": "english.gse.skill.young.listening.33.can-recognise-simple-phrases-related-to",
    "gse": 33,
    "skill": "Listening",
    "text": "Can recognise simple phrases related to familiar topics in slow, clear speech."
  },
  {
    "shortId": "L33.2",
    "nodeId": "english.gse.skill.young.listening.33.can-identify-basic-factual-information-i",
    "gse": 33,
    "skill": "Listening",
    "text": "Can identify basic factual information in short, simple dialogues or stories on familiar everyday topics, if spoken slowly and clearly."
  },
  {
    "shortId": "L33.3",
    "nodeId": "english.gse.skill.young.listening.33.can-understand-the-main-information-in-s",
    "gse": 33,
    "skill": "Listening",
    "text": "Can understand the main information in short, simple dialogues about someone’s hobbies and interests, if spoken slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L33.4",
    "nodeId": "english.gse.skill.young.listening.33.can-identify-key-information-eg-day-date",
    "gse": 33,
    "skill": "Listening",
    "text": "Can identify key information (e.g. ‘day’, ‘date’, ‘location’) in short announcements about events, if spoken slowly and clearly."
  },
  {
    "shortId": "R33.1",
    "nodeId": "english.gse.skill.young.reading.33.can-understand-key-information-about-tim",
    "gse": 33,
    "skill": "Reading",
    "text": "Can understand key information about time and place in short, simple messages from family or friends."
  },
  {
    "shortId": "R33.2",
    "nodeId": "english.gse.skill.young.reading.33.can-identify-key-information-in-short-si",
    "gse": 33,
    "skill": "Reading",
    "text": "Can identify key information in short, simple factual texts from the headings and illustrations."
  },
  {
    "shortId": "R33.3",
    "nodeId": "english.gse.skill.young.reading.33.can-get-the-gist-of-short-simple-texts-o",
    "gse": 33,
    "skill": "Reading",
    "text": "Can get the gist of short, simple texts on familiar topics, if supported by pictures."
  },
  {
    "shortId": "R33.4",
    "nodeId": "english.gse.skill.young.reading.33.can-identify-the-overall-theme-of-a-simp",
    "gse": 33,
    "skill": "Reading",
    "text": "Can identify the overall theme of a simple illustrated story, if guided by questions or prompts."
  },
  {
    "shortId": "R33.5",
    "nodeId": "english.gse.skill.young.reading.33.can-follow-the-sequence-of-events-in-a-s",
    "gse": 33,
    "skill": "Reading",
    "text": "Can follow the sequence of events in a short text on a familiar, everyday topic"
  },
  {
    "shortId": "R33.6",
    "nodeId": "english.gse.skill.young.reading.33.can-understand-a-key-to-locate-buildings",
    "gse": 33,
    "skill": "Reading",
    "text": "Can understand a key to locate buildings or simple features on a map."
  },
  {
    "shortId": "L34.1",
    "nodeId": "english.gse.skill.young.listening.34.can-get-the-gist-of-a-short-weather-fore",
    "gse": 34,
    "skill": "Listening",
    "text": "Can get the gist of a short weather forecast, if delivered slowly and clearly and supported by pictures."
  },
  {
    "shortId": "L34.2",
    "nodeId": "english.gse.skill.young.listening.34.can-identify-specific-information-in-sho",
    "gse": 34,
    "skill": "Listening",
    "text": "Can identify specific information in short, simple dialogues, if there is some repetition and rephrasing."
  },
  {
    "shortId": "L34.3",
    "nodeId": "english.gse.skill.young.listening.34.can-recognise-the-use-of-simple-linking",
    "gse": 34,
    "skill": "Listening",
    "text": "Can recognise the use of simple linking words e.g. ‘and’, ‘so’, or ‘but’ to connect ideas in a short phrase or sentence."
  },
  {
    "shortId": "L34.4",
    "nodeId": "english.gse.skill.young.listening.34.can-understand-excuses-if-expressed-in-s",
    "gse": 34,
    "skill": "Listening",
    "text": "Can understand excuses if expressed in simple language."
  },
  {
    "shortId": "L34.5",
    "nodeId": "english.gse.skill.young.listening.34.can-understand-simple-directions-for-how",
    "gse": 34,
    "skill": "Listening",
    "text": "Can understand simple directions for how to get somewhere on foot, if spoken slowly and clearly and using a map."
  },
  {
    "shortId": "L34.6",
    "nodeId": "english.gse.skill.young.listening.34.can-identify-key-information-in-short-co",
    "gse": 34,
    "skill": "Listening",
    "text": "Can identify key information in short conversations on school-related topics e.g. ‘subjects’, ‘timetables’, ‘homework.’"
  },
  {
    "shortId": "R34.1",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-some-simple-details-in-a",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand some simple details in a short text."
  },
  {
    "shortId": "R34.10",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-safety-instructions-if-ex",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand safety instructions if expressed in simple language and supported by pictures."
  },
  {
    "shortId": "R34.2",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-the-main-points-of-short",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand the main points of short, simple dialogues related to everyday situations, if guided by questions."
  },
  {
    "shortId": "R34.3",
    "nodeId": "english.gse.skill.young.reading.34.can-identify-key-information-in-short-si",
    "gse": 34,
    "skill": "Reading",
    "text": "Can identify key information in short, simple, factual texts."
  },
  {
    "shortId": "R34.4",
    "nodeId": "english.gse.skill.young.reading.34.can-recognise-the-use-of-simple-linking",
    "gse": 34,
    "skill": "Reading",
    "text": "Can recognise the use of simple linking words e.g. ‘and’, ‘so’, or ‘but’ to connect ideas in a short phrase or sentence."
  },
  {
    "shortId": "R34.5",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-short-simple-notes-from-f",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand short, simple notes from family or friends communicating information of immediate relevance."
  },
  {
    "shortId": "R34.6",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-basic-details-in-simple-i",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand basic details in simple informational texts (e.g. ‘brochures’, ‘leaflets’)."
  },
  {
    "shortId": "R34.7",
    "nodeId": "english.gse.skill.young.reading.34.can-understand-short-paragraphs-on-subje",
    "gse": 34,
    "skill": "Reading",
    "text": "Can understand short paragraphs on subjects of personal interest (e.g. ‘sports’, ‘music’, ‘travel’) if written using simple language and supported by pictures."
  },
  {
    "shortId": "R34.8",
    "nodeId": "english.gse.skill.young.reading.34.can-extract-specific-information-eg-fact",
    "gse": 34,
    "skill": "Reading",
    "text": "Can extract specific information (e.g. ‘facts and numbers’) from simple informational texts related to everyday life (e.g. ‘posters’, ‘leaflets’)."
  },
  {
    "shortId": "R34.9",
    "nodeId": "english.gse.skill.young.reading.34.can-use-a-simple-contents-page-to-locate",
    "gse": 34,
    "skill": "Reading",
    "text": "Can use a simple contents page to locate information."
  },
  {
    "shortId": "L35.1",
    "nodeId": "english.gse.skill.young.listening.35.can-understand-the-main-information-in-s",
    "gse": 35,
    "skill": "Listening",
    "text": "Can understand the main information in short, simple dialogues about familiar activities, if spoken slowly and clearly."
  },
  {
    "shortId": "L35.2",
    "nodeId": "english.gse.skill.young.listening.35.can-identify-key-information-about-futur",
    "gse": 35,
    "skill": "Listening",
    "text": "Can identify key information about future plans in short, simple dialogues."
  },
  {
    "shortId": "L35.3",
    "nodeId": "english.gse.skill.young.listening.35.can-understand-simple-comparisons-betwee",
    "gse": 35,
    "skill": "Listening",
    "text": "Can understand simple comparisons between two places, if spoken slowly and clearly."
  },
  {
    "shortId": "L35.4",
    "nodeId": "english.gse.skill.young.listening.35.can-identify-the-context-in-which-an-eve",
    "gse": 35,
    "skill": "Listening",
    "text": "Can identify the context in which an everyday conversation is taking place."
  },
  {
    "shortId": "L35.5",
    "nodeId": "english.gse.skill.young.listening.35.can-identify-numbers-relating-to-height",
    "gse": 35,
    "skill": "Listening",
    "text": "Can identify numbers relating to height, weight, length etc. in simple descriptions of objects, animals or buildings, if guided by questions."
  },
  {
    "shortId": "L35.6",
    "nodeId": "english.gse.skill.young.listening.35.can-identify-key-information-such-as-pri",
    "gse": 35,
    "skill": "Listening",
    "text": "Can identify key information such as prices, times and dates in a short description, if supported by prompts or questions."
  },
  {
    "shortId": "R35.1",
    "nodeId": "english.gse.skill.young.reading.35.can-use-key-words-or-captions-to-find-in",
    "gse": 35,
    "skill": "Reading",
    "text": "Can use key words or captions to find information in a simple text."
  },
  {
    "shortId": "R35.2",
    "nodeId": "english.gse.skill.young.reading.35.can-identify-specific-information-in-a-s",
    "gse": 35,
    "skill": "Reading",
    "text": "Can identify specific information in a simple story, if guided by questions."
  },
  {
    "shortId": "R35.3",
    "nodeId": "english.gse.skill.young.reading.35.can-understand-the-main-ideas-in-simple",
    "gse": 35,
    "skill": "Reading",
    "text": "Can understand the main ideas in simple informational texts, if supported by pictures."
  },
  {
    "shortId": "R35.4",
    "nodeId": "english.gse.skill.young.reading.35.can-understand-information-about-someone",
    "gse": 35,
    "skill": "Reading",
    "text": "Can understand information about someone’s personal details in a simple paragraph or short text."
  },
  {
    "shortId": "R35.5",
    "nodeId": "english.gse.skill.young.reading.35.can-follow-simple-stories-with-basic-dia",
    "gse": 35,
    "skill": "Reading",
    "text": "Can follow simple stories with basic dialogue and simple narrative."
  },
  {
    "shortId": "R35.6",
    "nodeId": "english.gse.skill.young.reading.35.can-identify-the-context-of-a-short-simp",
    "gse": 35,
    "skill": "Reading",
    "text": "Can identify the context of a short, simple text related to familiar situations."
  },
  {
    "shortId": "L36.1",
    "nodeId": "english.gse.skill.young.listening.36.can-identify-the-main-points-in-short-ta",
    "gse": 36,
    "skill": "Listening",
    "text": "Can identify the main points in short talks on familiar topics, if delivered slowly and clearly."
  },
  {
    "shortId": "L36.2",
    "nodeId": "english.gse.skill.young.listening.36.can-identify-activities-occurring-in-the",
    "gse": 36,
    "skill": "Listening",
    "text": "Can identify activities occurring in the past in short, simple dialogues."
  },
  {
    "shortId": "L36.3",
    "nodeId": "english.gse.skill.young.listening.36.can-follow-the-sequence-of-events-in-a-s",
    "gse": 36,
    "skill": "Listening",
    "text": "Can follow the sequence of events in a simple story or narrative, if told slowly and clearly."
  },
  {
    "shortId": "L36.4",
    "nodeId": "english.gse.skill.young.listening.36.can-understand-peoples-likes-in-informal",
    "gse": 36,
    "skill": "Listening",
    "text": "Can understand people’s likes in informal conversations, if the speakers talk slowly and clearly."
  },
  {
    "shortId": "L36.5",
    "nodeId": "english.gse.skill.young.listening.36.can-identify-specific-information-in-sho",
    "gse": 36,
    "skill": "Listening",
    "text": "Can identify specific information in short, simple dialogues in which speakers make arrangements to do something, if spoken slowly and clearly."
  },
  {
    "shortId": "L36.6",
    "nodeId": "english.gse.skill.young.listening.36.can-identify-specific-information-about",
    "gse": 36,
    "skill": "Listening",
    "text": "Can identify specific information about people’s personalities in short, simple dialogues, if spoken slowly and clearly."
  },
  {
    "shortId": "R36.1",
    "nodeId": "english.gse.skill.young.reading.36.can-understand-the-main-themes-of-a-simp",
    "gse": 36,
    "skill": "Reading",
    "text": "Can understand the main themes of a simplified story."
  },
  {
    "shortId": "R36.2",
    "nodeId": "english.gse.skill.young.reading.36.can-follow-a-simple-series-of-written-in",
    "gse": 36,
    "skill": "Reading",
    "text": "Can follow a simple series of written instructions to carry out a task."
  },
  {
    "shortId": "R36.3",
    "nodeId": "english.gse.skill.young.reading.36.can-follow-instructions-and-feedback-in",
    "gse": 36,
    "skill": "Reading",
    "text": "Can follow instructions and feedback in a computer game."
  },
  {
    "shortId": "L37.1",
    "nodeId": "english.gse.skill.young.listening.37.can-follow-multi-step-instructions-if-gi",
    "gse": 37,
    "skill": "Listening",
    "text": "Can follow multi-step instructions if given slowly and clearly."
  },
  {
    "shortId": "L37.2",
    "nodeId": "english.gse.skill.young.listening.37.can-understand-most-of-the-concrete-deta",
    "gse": 37,
    "skill": "Listening",
    "text": "Can understand most of the concrete details in informal conversations on familiar everyday topics, if the speakers talk slowly and clearly."
  },
  {
    "shortId": "L37.3",
    "nodeId": "english.gse.skill.young.listening.37.can-recognise-simple-expressions-of-agre",
    "gse": 37,
    "skill": "Listening",
    "text": "Can recognise simple expressions of agreement and disagreement in short, informal discussions, if the speakers talk slowly and clearly."
  },
  {
    "shortId": "L37.4",
    "nodeId": "english.gse.skill.young.listening.37.can-understand-simple-directions-on-how",
    "gse": 37,
    "skill": "Listening",
    "text": "Can understand simple directions on how to get somewhere by public transport, with reference to a map."
  },
  {
    "shortId": "R37.1",
    "nodeId": "english.gse.skill.young.reading.37.can-understand-the-main-information-in-b",
    "gse": 37,
    "skill": "Reading",
    "text": "Can understand the main information in basic diagrams related to familiar topics."
  },
  {
    "shortId": "R37.10",
    "nodeId": "english.gse.skill.young.reading.37.can-understand-the-meaning-of-short-text",
    "gse": 37,
    "skill": "Reading",
    "text": "Can understand the meaning of short texts using information they already know."
  },
  {
    "shortId": "R37.2",
    "nodeId": "english.gse.skill.young.reading.37.can-understand-the-correct-sequence-of-e",
    "gse": 37,
    "skill": "Reading",
    "text": "Can understand the correct sequence of events in a simple story or dialogue."
  },
  {
    "shortId": "R37.3",
    "nodeId": "english.gse.skill.young.reading.37.can-guess-the-meaning-of-unfamiliar-word",
    "gse": 37,
    "skill": "Reading",
    "text": "Can guess the meaning of unfamiliar words in short, simple stories, if supported by pictures."
  },
  {
    "shortId": "R37.4",
    "nodeId": "english.gse.skill.young.reading.37.can-identify-basic-similarities-and-diff",
    "gse": 37,
    "skill": "Reading",
    "text": "Can identify basic similarities and differences in the facts between two short simple texts on the same familiar topic, if supported by pictures and questions."
  },
  {
    "shortId": "R37.5",
    "nodeId": "english.gse.skill.young.reading.37.can-recognise-the-use-of-simple-linking",
    "gse": 37,
    "skill": "Reading",
    "text": "Can recognise the use of simple linking words to connect ideas in short paragraphs."
  },
  {
    "shortId": "R37.6",
    "nodeId": "english.gse.skill.young.reading.37.can-identify-specific-information-relate",
    "gse": 37,
    "skill": "Reading",
    "text": "Can identify specific information related to a familiar topic in a short, simple text."
  },
  {
    "shortId": "R37.7",
    "nodeId": "english.gse.skill.young.reading.37.can-identify-basic-biographical-informat",
    "gse": 37,
    "skill": "Reading",
    "text": "Can identify basic biographical information in short simple texts about other people."
  },
  {
    "shortId": "R37.8",
    "nodeId": "english.gse.skill.young.reading.37.can-find-the-correct-meaning-of-a-word-i",
    "gse": 37,
    "skill": "Reading",
    "text": "Can find the correct meaning of a word in a bilingual dictionary."
  },
  {
    "shortId": "R37.9",
    "nodeId": "english.gse.skill.young.reading.37.can-understand-likes-and-preferences-in",
    "gse": 37,
    "skill": "Reading",
    "text": "Can understand likes and preferences in short, simple personal texts (e.g. ‘diary entries’ or ‘emails’)."
  },
  {
    "shortId": "L38.1",
    "nodeId": "english.gse.skill.young.listening.38.can-identify-key-details-eg-name-number",
    "gse": 38,
    "skill": "Listening",
    "text": "Can identify key details (e.g. ‘name’, ‘number’) in factual talks on familiar topics, if spoken slowly and clearly."
  },
  {
    "shortId": "L38.2",
    "nodeId": "english.gse.skill.young.listening.38.can-identify-key-information-in-a-short",
    "gse": 38,
    "skill": "Listening",
    "text": "Can identify key information in a short passage or description, if supported by prompts or questions."
  },
  {
    "shortId": "L38.3",
    "nodeId": "english.gse.skill.young.listening.38.can-understand-peoples-preferences-in-in",
    "gse": 38,
    "skill": "Listening",
    "text": "Can understand people’s preferences in informal conversations, if the speakers talk slowly and clearly."
  },
  {
    "shortId": "L38.4",
    "nodeId": "english.gse.skill.young.listening.38.can-identify-the-key-information-in-shor",
    "gse": 38,
    "skill": "Listening",
    "text": "Can identify the key information in short, simple recorded phone messages related to everyday situations (e.g. ‘what’s on at the cinema’)."
  },
  {
    "shortId": "L38.5",
    "nodeId": "english.gse.skill.young.listening.38.can-understand-specific-information-in-a",
    "gse": 38,
    "skill": "Listening",
    "text": "Can understand specific information in a short, simple phone call."
  },
  {
    "shortId": "R38.1",
    "nodeId": "english.gse.skill.young.reading.38.can-find-appropriate-words-or-phrases-to",
    "gse": 38,
    "skill": "Reading",
    "text": "Can find appropriate words or phrases to describe a picture."
  },
  {
    "shortId": "R38.10",
    "nodeId": "english.gse.skill.young.reading.38.can-recognise-basic-fixed-expressions-us",
    "gse": 38,
    "skill": "Reading",
    "text": "Can recognise basic fixed expressions used to start or end an email."
  },
  {
    "shortId": "R38.11",
    "nodeId": "english.gse.skill.young.reading.38.can-follow-simple-recipes-if-supported-b",
    "gse": 38,
    "skill": "Reading",
    "text": "Can follow simple recipes, if supported by pictures."
  },
  {
    "shortId": "R38.12",
    "nodeId": "english.gse.skill.young.reading.38.can-understand-the-main-ideas-in-short-s",
    "gse": 38,
    "skill": "Reading",
    "text": "Can understand the main ideas in short, simple stories on familiar topics."
  },
  {
    "shortId": "R38.13",
    "nodeId": "english.gse.skill.young.reading.38.can-follow-basic-instructions-in-order-t",
    "gse": 38,
    "skill": "Reading",
    "text": "Can follow basic instructions in order to complete a simple shared online task, provided they can ask for help when necessary."
  },
  {
    "shortId": "R38.2",
    "nodeId": "english.gse.skill.young.reading.38.can-identify-words-and-phrases-from-diff",
    "gse": 38,
    "skill": "Reading",
    "text": "Can identify words and phrases from different places in a simple text to support their answers."
  },
  {
    "shortId": "R38.3",
    "nodeId": "english.gse.skill.young.reading.38.can-understand-a-simple-text-about-a-pas",
    "gse": 38,
    "skill": "Reading",
    "text": "Can understand a simple text about a past event."
  },
  {
    "shortId": "R38.4",
    "nodeId": "english.gse.skill.young.reading.38.can-identify-which-people-or-objects-are",
    "gse": 38,
    "skill": "Reading",
    "text": "Can identify which people or objects are being referred to in a text."
  },
  {
    "shortId": "R38.5",
    "nodeId": "english.gse.skill.young.reading.38.can-recognise-familiar-words-in-unfamili",
    "gse": 38,
    "skill": "Reading",
    "text": "Can recognise familiar words in unfamiliar contexts in descriptive texts and stories."
  },
  {
    "shortId": "R38.6",
    "nodeId": "english.gse.skill.young.reading.38.can-understand-simple-details-in-short-a",
    "gse": 38,
    "skill": "Reading",
    "text": "Can understand simple details in short animal factfiles containing some unfamiliar language, if supported by pictures."
  },
  {
    "shortId": "R38.7",
    "nodeId": "english.gse.skill.young.reading.38.can-recognise-the-use-of-because-to-sign",
    "gse": 38,
    "skill": "Reading",
    "text": "Can recognise the use of ‘because’ to signal the relationship between an action and a reason or explanation."
  },
  {
    "shortId": "R38.8",
    "nodeId": "english.gse.skill.young.reading.38.can-identify-the-main-topic-of-a-simple",
    "gse": 38,
    "skill": "Reading",
    "text": "Can identify the main topic of a simple structured text."
  },
  {
    "shortId": "R38.9",
    "nodeId": "english.gse.skill.young.reading.38.can-identify-key-parts-of-simple-stories",
    "gse": 38,
    "skill": "Reading",
    "text": "Can identify key parts of simple stories (e.g. ‘beginning’, ‘middle’, ‘end’)."
  },
  {
    "shortId": "L39.1",
    "nodeId": "english.gse.skill.young.listening.39.can-understand-the-main-idea-of-a-simple",
    "gse": 39,
    "skill": "Listening",
    "text": "Can understand the main idea of a simple news story, with visual support."
  },
  {
    "shortId": "L39.2",
    "nodeId": "english.gse.skill.young.listening.39.can-extract-factual-information-from-sho",
    "gse": 39,
    "skill": "Listening",
    "text": "Can extract factual information from short, simple dialogues or stories about past events if spoken slowly and clearly and guided by questions or prompts."
  },
  {
    "shortId": "L39.3",
    "nodeId": "english.gse.skill.young.listening.39.can-make-basic-inferences-about-simple-i",
    "gse": 39,
    "skill": "Listening",
    "text": "Can make basic inferences about simple information in a short conversation or passage."
  },
  {
    "shortId": "L39.4",
    "nodeId": "english.gse.skill.young.listening.39.can-understand-a-limited-range-of-basic",
    "gse": 39,
    "skill": "Listening",
    "text": "Can understand a limited range of basic language related to common symptoms and illnesses."
  },
  {
    "shortId": "L39.5",
    "nodeId": "english.gse.skill.young.listening.39.can-understand-the-meaning-of-short-conv",
    "gse": 39,
    "skill": "Listening",
    "text": "Can understand the meaning of short conversations or passages using information they already know."
  },
  {
    "shortId": "L39.6",
    "nodeId": "english.gse.skill.young.listening.39.can-recognise-simple-examples-used-to-su",
    "gse": 39,
    "skill": "Listening",
    "text": "Can recognise simple examples used to support the speaker’s points in short talks on familiar topics, if clearly introduced by linking words/phrases."
  },
  {
    "shortId": "R39.1",
    "nodeId": "english.gse.skill.young.reading.39.can-understand-short-school-related-mess",
    "gse": 39,
    "skill": "Reading",
    "text": "Can understand short school-related messages in emails, text messages and social media postings."
  },
  {
    "shortId": "R39.2",
    "nodeId": "english.gse.skill.young.reading.39.can-predict-what-a-short-simple-text-is",
    "gse": 39,
    "skill": "Reading",
    "text": "Can predict what a short, simple text is about from the title, a picture etc., if guided by questions or prompts."
  },
  {
    "shortId": "R39.3",
    "nodeId": "english.gse.skill.young.reading.39.can-understand-the-main-points-in-simple",
    "gse": 39,
    "skill": "Reading",
    "text": "Can understand the main points in simple descriptive texts on familiar topics."
  },
  {
    "shortId": "R39.4",
    "nodeId": "english.gse.skill.young.reading.39.can-recognise-the-use-of-because-to-sign",
    "gse": 39,
    "skill": "Reading",
    "text": "Can recognise the use of ‘because’ to signal the relationship between an opinion and a reason."
  },
  {
    "shortId": "R39.5",
    "nodeId": "english.gse.skill.young.reading.39.can-recognise-different-phrases-used-for",
    "gse": 39,
    "skill": "Reading",
    "text": "Can recognise different phrases used for a similar purpose (e.g. ‘Let’s’ / ‘Shall we’) to make a suggestion."
  },
  {
    "shortId": "R39.6",
    "nodeId": "english.gse.skill.young.reading.39.can-find-specific-information-about-typi",
    "gse": 39,
    "skill": "Reading",
    "text": "Can find specific information about typical free-time activities for young people in simple illustrated information leaflets."
  },
  {
    "shortId": "R39.7",
    "nodeId": "english.gse.skill.young.reading.39.can-extract-specific-information-in-shor",
    "gse": 39,
    "skill": "Reading",
    "text": "Can extract specific information in short texts on familiar topics."
  },
  {
    "shortId": "R40.1",
    "nodeId": "english.gse.skill.young.reading.40.can-make-simple-inferences-about-a-chara",
    "gse": 40,
    "skill": "Reading",
    "text": "Can make simple inferences about a character’s feelings in a familiar story, if supported by questions or prompts."
  },
  {
    "shortId": "R40.2",
    "nodeId": "english.gse.skill.young.reading.40.can-recognise-some-basic-features-of-sho",
    "gse": 40,
    "skill": "Reading",
    "text": "Can recognise some basic features of short non-fiction texts (e.g. ‘a heading’)."
  },
  {
    "shortId": "R40.3",
    "nodeId": "english.gse.skill.young.reading.40.can-guess-the-meaning-of-a-new-word-from",
    "gse": 40,
    "skill": "Reading",
    "text": "Can guess the meaning of a new word from knowledge of part of it (e.g. ‘children’/ ‘child’, ‘your/you’, ‘going/go’)."
  },
  {
    "shortId": "R40.4",
    "nodeId": "english.gse.skill.young.reading.40.can-recognise-most-frequent-everyday-wor",
    "gse": 40,
    "skill": "Reading",
    "text": "Can recognise most frequent everyday words, including those with regular prefixes and suffixes."
  },
  {
    "shortId": "R40.5",
    "nodeId": "english.gse.skill.young.reading.40.can-make-basic-inferences-from-simple-in",
    "gse": 40,
    "skill": "Reading",
    "text": "Can make basic inferences from simple information in a short text."
  },
  {
    "shortId": "R40.6",
    "nodeId": "english.gse.skill.young.reading.40.can-understand-short-simple-texts-giving",
    "gse": 40,
    "skill": "Reading",
    "text": "Can understand short, simple texts giving information about important places in a town, with the support of a map."
  },
  {
    "shortId": "R40.7",
    "nodeId": "english.gse.skill.young.reading.40.can-understand-who-a-simple-text-was-wri",
    "gse": 40,
    "skill": "Reading",
    "text": "Can understand who a simple text was written for."
  },
  {
    "shortId": "R40.8",
    "nodeId": "english.gse.skill.young.reading.40.can-extract-factual-details-from-a-simpl",
    "gse": 40,
    "skill": "Reading",
    "text": "Can extract factual details from a simple text."
  },
  {
    "shortId": "R40.9",
    "nodeId": "english.gse.skill.young.reading.40.can-extract-key-information-from-adverti",
    "gse": 40,
    "skill": "Reading",
    "text": "Can extract key information from advertisements for familiar products, if guided by questions or prompts."
  },
  {
    "shortId": "L41.1",
    "nodeId": "english.gse.skill.young.listening.41.can-follow-detailed-instructions-to-comp",
    "gse": 41,
    "skill": "Listening",
    "text": "Can follow detailed instructions to complete familiar tasks."
  },
  {
    "shortId": "L41.2",
    "nodeId": "english.gse.skill.young.listening.41.can-get-the-gist-of-authentic-recorded-m",
    "gse": 41,
    "skill": "Listening",
    "text": "Can get the gist of authentic recorded material on topics of personal interest, if delivered in clear standard speech."
  },
  {
    "shortId": "L41.3",
    "nodeId": "english.gse.skill.young.listening.41.can-identify-simple-information-in-a-sho",
    "gse": 41,
    "skill": "Listening",
    "text": "Can identify simple information in a short conversation or passage that isn’t explicitly stated."
  },
  {
    "shortId": "L41.4",
    "nodeId": "english.gse.skill.young.listening.41.can-understand-differences-between-the-i",
    "gse": 41,
    "skill": "Listening",
    "text": "Can understand differences between the information given in short conversations or passages on similar topics."
  },
  {
    "shortId": "L41.5",
    "nodeId": "english.gse.skill.young.listening.41.can-understand-similarities-between-the",
    "gse": 41,
    "skill": "Listening",
    "text": "Can understand similarities between the information given in short conversations or passages on similar topics."
  },
  {
    "shortId": "R41.1",
    "nodeId": "english.gse.skill.young.reading.41.can-understand-basic-opinions-related-to",
    "gse": 41,
    "skill": "Reading",
    "text": "Can understand basic opinions related to familiar topics, expressed in simple language."
  },
  {
    "shortId": "R41.2",
    "nodeId": "english.gse.skill.young.reading.41.can-get-the-gist-of-short-factual-school",
    "gse": 41,
    "skill": "Reading",
    "text": "Can get the gist of short factual school texts."
  },
  {
    "shortId": "R41.3",
    "nodeId": "english.gse.skill.young.reading.41.can-understand-the-order-in-which-events",
    "gse": 41,
    "skill": "Reading",
    "text": "Can understand the order in which events happen (e.g. ‘in diary entries’ or ‘a story’)."
  },
  {
    "shortId": "R41.4",
    "nodeId": "english.gse.skill.young.reading.41.can-scan-a-simple-text-to-find-specific",
    "gse": 41,
    "skill": "Reading",
    "text": "Can scan a simple text to find specific information."
  },
  {
    "shortId": "R41.5",
    "nodeId": "english.gse.skill.young.reading.41.can-identify-main-paragraph-topics-in-si",
    "gse": 41,
    "skill": "Reading",
    "text": "Can identify main paragraph topics in simple texts on familiar subjects, if supported by prompts or questions."
  },
  {
    "shortId": "L42.1",
    "nodeId": "english.gse.skill.young.listening.42.can-guess-the-meaning-of-new-words-from",
    "gse": 42,
    "skill": "Listening",
    "text": "Can guess the meaning of new words from a familiar vocabulary set by relating them to known words in the same set."
  },
  {
    "shortId": "L42.2",
    "nodeId": "english.gse.skill.young.listening.42.can-understand-some-details-in-longer-di",
    "gse": 42,
    "skill": "Listening",
    "text": "Can understand some details in longer dialogues on familiar everyday topics, if guided by questions or prompts."
  },
  {
    "shortId": "L42.3",
    "nodeId": "english.gse.skill.young.listening.42.can-identify-basic-biographical-informat",
    "gse": 42,
    "skill": "Listening",
    "text": "Can identify basic biographical information in short simple talks about famous people from the past, if delivered slowly and clearly."
  },
  {
    "shortId": "L42.4",
    "nodeId": "english.gse.skill.young.listening.42.can-understand-simple-conversations-abou",
    "gse": 42,
    "skill": "Listening",
    "text": "Can understand simple conversations about things that have happened in the past."
  },
  {
    "shortId": "L42.5",
    "nodeId": "english.gse.skill.young.listening.42.can-identify-ideas-that-are-connected-in",
    "gse": 42,
    "skill": "Listening",
    "text": "Can identify ideas that are connected in a short conversation or passage."
  },
  {
    "shortId": "L42.6",
    "nodeId": "english.gse.skill.young.listening.42.can-guess-the-meaning-of-simple-unknown",
    "gse": 42,
    "skill": "Listening",
    "text": "Can guess the meaning of simple, unknown words in short dialogues on familiar topics."
  },
  {
    "shortId": "R42.1",
    "nodeId": "english.gse.skill.young.reading.42.can-identify-a-point-of-view-in-a-short",
    "gse": 42,
    "skill": "Reading",
    "text": "Can identify a point of view in a short, simple narrative text."
  },
  {
    "shortId": "R42.2",
    "nodeId": "english.gse.skill.young.reading.42.can-read-a-short-text-and-predict-what-t",
    "gse": 42,
    "skill": "Reading",
    "text": "Can read a short text and predict what they think will happen next."
  },
  {
    "shortId": "R42.3",
    "nodeId": "english.gse.skill.young.reading.42.can-follow-the-sequence-of-events-in-sim",
    "gse": 42,
    "skill": "Reading",
    "text": "Can follow the sequence of events in simple narrative texts by recognising common linking words/ phrases."
  },
  {
    "shortId": "R42.4",
    "nodeId": "english.gse.skill.young.reading.42.can-identify-key-vocabulary-and-expressi",
    "gse": 42,
    "skill": "Reading",
    "text": "Can identify key vocabulary and expressions in unfamiliar texts related to school subjects."
  },
  {
    "shortId": "R42.5",
    "nodeId": "english.gse.skill.young.reading.42.can-identify-the-parts-of-some-short-non",
    "gse": 42,
    "skill": "Reading",
    "text": "Can identify the parts of some short, non-fictional text types (e.g. ‘notes’, ‘captions’, ‘blogs’, ‘instructions’)."
  },
  {
    "shortId": "R42.6",
    "nodeId": "english.gse.skill.young.reading.42.can-identify-the-differences-between-two",
    "gse": 42,
    "skill": "Reading",
    "text": "Can identify the differences between two similar versions of a text, if guided by questions."
  }
];
