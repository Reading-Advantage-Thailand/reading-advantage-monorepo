/**
 * The Primary objective key: every objective short id the Workbooks lesson packages use, with its
 * GSE node (track primary_objective_tags_20261006, FR-1). Generated from
 * `~/Desktop/Workbooks/docs/content-plans/data/a0-objective-key.json` and `a1-objective-key.json`
 * (Workbooks commit 2f1bf6b) and the graph releases of `content/primary/tags.json`. Do not edit by
 * hand; regenerate from the key files. The child-language titles (`titleEn`, `titleTh`, `exampleEn`)
 * are filled by the Workbooks authors when they exist (program decision 10).
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
    "commit": "2daf568",
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
  }
];
