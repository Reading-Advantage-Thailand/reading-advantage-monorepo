import { en } from './en.js';
import { th } from './th.js';

export interface TranslationKeys {
  titlePage: {
    badge: string;
    subtitle: string;
    note: string;
  };
  preface: {
    heading: string;
    welcome: (series: string, level: string) => string;
    periodOverviewIntro: string;
    period1Overview: string;
    period2Overview: string;
    period3Overview: string;
    period4Overview: string;
    howToUseHeading: string;
    stepInsertsDesc: string;
    teachingNotesDesc: string;
    bellRingersDesc: string;
    onlineComponentsDesc: string;
    blendedLearningHeading: string;
    blendedLearningIntro: string;
    workbookAnchor: string;
    appSupports: string;
    teacherAnchors: string;
  };
  lessonPlanStructure: {
    heading: string;
    intro: string;
    period1Title: string;
    period1Step1: string;
    period1Step2: string;
    period1Step3: string;
    period1Step4: string;
    period1BellRinger: string;
    period1Online: string;
    period2Title: string;
    period2Step5: string;
    period2Step6: string;
    period2Step7: string;
    period2BellRinger: string;
    period2Spelling: string;
    period2Online: string;
    period3Title: string;
    period3Step8: string;
    period3Step9: string;
    period3Step10: string;
    period3BellRinger: string;
    period3Spelling: string;
    period3Online: string;
    period4Title: string;
    period4Step11: string;
    period4Step12: string;
    period4Step13: string;
    period4BellRinger: string;
    period4Spelling: string;
    period4Online: string;
  };
  pedagogy: {
    heading: string;
    pairWorkHeading: string;
    pairWorkItems: string[];
    discussionHeading: string;
    thinkPairShare: string;
    evidenceFirst: string;
    coldCall: string;
    noWrongInterest: string;
    appAudioHeading: string;
    appAudioItems: string[];
    blendedFlowHeading: string;
    blendedFlowItems: string[];
  };
  flashcardGames: {
    heading: string;
    intro: string;
    period1Heading: string;
    period1Desc: string;
    period24Heading: string;
    period24Desc: string;
    memoryTitle: string;
    memoryDesc: string;
    goFishTitle: string;
    goFishDesc: string;
    snapTitle: string;
    snapDesc: string;
    quizShowTitle: string;
    quizShowDesc: string;
    moreGames: string;
  };
  spellingRoutine: {
    heading: string;
    intro: string;
    traceTitle: string;
    traceDesc: string;
    writeTitle: string;
    writeDesc: string;
    coverWriteTitle: string;
    coverWriteDesc: string;
    note: string;
  };
  goalSetting: {
    heading: string;
    intro: string;
    howToIntroduceHeading: string;
    explainPurpose: string;
    modelGoal: string;
    guideGoalWriting: string;
    actionPlans: string;
    revisit: string;
    categoriesHeading: string;
    reading: string;
    writing: string;
    vocabulary: string;
  };
  teachingNotes: {
    teacherActions: string;
    teacherLanguage: string;
    studentActions: string;
    watchFor: string;
  };
  stepInsert: {
    studentView: string;
    step: string;
    untitled: string;
    noVocab: string;
    wordHeader: string;
    phoneticHeader: string;
    meaningHeader: string;
    interestLabel: string;
    writeNewWords: string;
    word: string;
    paraNumber: string;
    writeMainIdea: string;
    chooseSentences: string;
    grammar: string;
    vocabulary: string;
    usefulPhrase: string;
    clue: string;
    question: string;
    hint: string;
    sentenceStarters: string;
    matchWords: string;
    fillBlanks: string;
    putWordsInOrder: string;
    completeSentence: string;
    writingPrompt: string;
    plan: string;
    sentenceFrames: string;
    draft: string;
    writeLanguageQuestion: string;
    articleImage: string;
    paragraphsTotal: (n: number) => string;
    paragraphs: (n: number) => string;
    understood: string;
    all: string;
    most: string;
    some: string;
    aLittle: string;
    effortWas: string;
    great: string;
    good: string;
    okay: string;
    needsWork: string;
    wantToLearn: string;
    allOptions: readonly string[];
    effortOptions: readonly string[];
  };
  periodPlan: {
    period: string;
    bellRinger: string;
    gameVariations: string;
    spellingTitle: string;
    onlineTitle: string;
    launchVocabulary: string;
    deepReadingComprehension: string;
    responsePractice: string;
    writingReflection: string;
    flashcardCutout: string;
    flashcardCutoutInstructions: string[];
    flashcardGame: string;
    flashcardGameInstructions: string[];
    fiveMinutes: string;
    memoryMatch: string;
    goFish: string;
    snap: string;
    quizShow: string;
    traceTitle: string;
    traceInstructions: string;
    writeTitle: string;
    writeInstructions: string;
    coverWriteTitle: string;
    coverWriteInstructions: string;
    onlineReading: string;
    extensiveReading: string;
    vocabReview: string;
    aiFeedback: string;
    progressTracker: string;
  };
  lessonPlan: {
    lesson: string;
    genre: string;
    type: string;
    cefr: string;
    duration: string;
    durationValue: string;
    objectives: string;
    lessonVocabulary: string;
    objectiveRead: (genre: string, title: string) => string;
    objectiveVocab: string;
    objectiveComprehension: string;
    objectiveWriting: string;
    untitled: string;
  };
  endMatter: {
    common: {
      tip: string;
      problem: string;
      solution: string;
    };
    selfAssessment: {
      heading: string;
      intro: string;
      beforeHeading: string;
      beforeItems: string[];
      duringHeading: string;
      duringItems: string[];
      afterHeading: string;
      afterItems: string[];
      tip: string;
    };
    certificate: {
      heading: string;
      intro: string;
      presentationTips: string;
      makeItSpecial: string;
      personalize: string;
      signIt: string;
      acknowledgeEffort: string;
      photoOp: string;
      whatToSayHeading: string;
      sayings: string[];
      tip: string;
    };
    troubleshooting: {
      heading: string;
      pacingTitle: string;
      pacingProblem: string;
      pacingSolutions: string[];
      appTitle: string;
      appProblem: string;
      appSolutions: string[];
      writingTitle: string;
      writingProblem: string;
      writingSolutions: string[];
      engagementTitle: string;
      engagementProblem: string;
      engagementSolutions: string[];
      aiTitle: string;
      aiProblem: string;
      aiSolutions: string[];
    };
  };
  documentWrapper: {
    titlePrefix: string;
    pageCounter: string;
  };
  teachingNotesContent: {
    1: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    2: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    3: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    4: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    5: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    6: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    7: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    8: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    9: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    10: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    11: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    12: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
    13: { teacherActions: string[]; teacherLanguage: string[]; studentActions: string[]; watchFor: string[]; };
  };
}

export type SupportedLanguage = 'en' | 'th';

const translations: Record<SupportedLanguage, TranslationKeys> = {
  en,
  th,
};

/**
 * Resolves the teacher-manual translation bundle for a language code.
 * @param lang Language code to look up; unknown codes fall back to English.
 * @returns The full translation key set for the resolved language.
 */
export function getTranslations(lang: string): TranslationKeys {
  if (Object.hasOwn(translations, lang)) {
    return translations[lang as SupportedLanguage];
  }
  return translations.en;
}
