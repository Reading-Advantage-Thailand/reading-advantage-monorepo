import type { TranslationKeys } from './index.js';
import { escapeHtml } from '../theme.js';

export const en: TranslationKeys = {
  // Title page
  titlePage: {
    badge: "Teacher's Manual",
    subtitle: 'Blended Learning Edition',
    note: 'Per-Project Lesson Plans with Step Inserts, Teaching Notes & Pacing Guides',
  },

  // Preface
  preface: {
    heading: 'Preface',
    welcome: (series: string, level: string) =>
      `Welcome to the <strong>${escapeHtml(series)} ${escapeHtml(level)}</strong> Teacher's Manual. This manual provides detailed lesson plans for all 14 lessons in this workbook level.`,
    periodOverviewIntro: 'Each lesson is organized into <strong>4 class periods</strong> (approximately 40 minutes each), covering the 13-step workbook sequence:',
    period1Overview: 'Period 1: Launch & Vocabulary (Steps 1-4)',
    period2Overview: 'Period 2: Deep Reading & Comprehension (Steps 5-7)',
    period3Overview: 'Period 3: Response & Practice (Steps 8-10)',
    period4Overview: 'Period 4: Writing & Reflection (Steps 11-13)',
    howToUseHeading: 'How to Use This Manual',
    stepInsertsDesc: '<strong>Step Inserts:</strong> Each period includes a reduced-size "Student View" showing exactly what students see in their workbook. Use these to stay synchronized with the printed page.',
    teachingNotesDesc: '<strong>Teaching Notes:</strong> For each step, you\'ll find Teacher Actions, Teacher Language (scripted prompts), What Students Do, and Watch For sections.',
    bellRingersDesc: '<strong>Bell-Ringers:</strong> Each period starts with a 5-minute flashcard activity to build vocabulary recall.',
    onlineComponentsDesc: '<strong>Online Components:</strong> Notes about app-based activities (QR reading, AI writing feedback, progress tracking) are integrated into each period.',
    blendedLearningHeading: 'Blended Learning Model',
    blendedLearningIntro: 'This workbook uses a blended learning approach combining the printed workbook with the Reading Advantage app:',
    workbookAnchor: 'The <strong>workbook is the lesson path</strong> — follow it page by page.',
    appSupports: 'The <strong>app supports the workbook</strong> — use QR codes for audio, AI for writing feedback, and the progress tracker for motivation.',
    teacherAnchors: 'The <strong>teacher anchors instruction</strong> — model tasks, use the scripted language, and mediate all AI interactions.',
  },

  // Lesson plan structure
  lessonPlanStructure: {
    heading: 'General Lesson Plan Structure',
    intro: 'Each of the 14 lessons in this workbook follows the same 4-period, 13-step structure. This consistency helps students know exactly what to expect each class.',
    period1Title: 'Period 1: Launch & Vocabulary (Steps 1-4)',
    period1Step1: '<strong>Step 1: Before You Read</strong> — Students preview the topic, mark interest level',
    period1Step2: '<strong>Step 2: Key Vocabulary</strong> — Teacher introduces words, students write meanings',
    period1Step3: '<strong>Step 3: Read the Article</strong> — First reading (listen & follow), second reading (mark & notice)',
    period1Step4: '<strong>Step 4: Collect Vocabulary</strong> — Students transfer key words to workbook boxes',
    period1BellRinger: 'Bell-Ringer: Flashcard cut-out and organization (5 min)',
    period1Online: 'Online: App article reading (QR/audio support)',
    period2Title: 'Period 2: Deep Reading & Comprehension (Steps 5-7)',
    period2Step5: '<strong>Step 5: Deep Reading Notes</strong> — Paragraph-by-paragraph main ideas',
    period2Step6: '<strong>Step 6: Collect Sentences</strong> — Choose 2 sentences to study',
    period2Step7: '<strong>Step 7: Comprehension Check</strong> — Multiple-choice with evidence',
    period2BellRinger: 'Bell-Ringer: Flashcard vocabulary game (5 min)',
    period2Spelling: 'Spelling: Trace activity',
    period2Online: 'Online: Extensive reading (app)',
    period3Title: 'Period 3: Response & Practice (Steps 8-10)',
    period3Step8: '<strong>Step 8: Guided Response</strong> — Short written response with sentence frames',
    period3Step9: '<strong>Step 9: Vocabulary Practice</strong> — Match and fill-in-the-blank',
    period3Step10: '<strong>Step 10: Sentence Practice</strong> — Word order and sentence completion',
    period3BellRinger: 'Bell-Ringer: Flashcard vocabulary game (5 min)',
    period3Spelling: 'Spelling: Write activity',
    period3Online: 'Online: App vocabulary/sentence review',
    period4Title: 'Period 4: Writing & Reflection (Steps 11-13)',
    period4Step11: '<strong>Step 11: Guided Writing</strong> — Plan, frame, draft, self-check',
    period4Step12: '<strong>Step 12: Language Questions</strong> — Write questions, teacher-mediated AI answers',
    period4Step13: '<strong>Step 13: Lesson Reflection</strong> — Understanding, effort, and homework',
    period4BellRinger: 'Bell-Ringer: Flashcard vocabulary game (5 min)',
    period4Spelling: 'Spelling: Cover-and-write activity',
    period4Online: 'Online: AI writing feedback discussion + Progress tracker update',
  },

  // Pedagogical guidelines
  pedagogy: {
    heading: 'Pedagogical Guidelines',
    pairWorkHeading: 'Pair Work Protocols',
    pairWorkItems: [
      'Assign pairs at the start of the semester and keep them stable for 4-6 weeks.',
      'Use pair work for: comprehension discussion (Step 7), sentence sharing (Step 6), and flashcard games.',
      'Set a clear signal for returning attention to the teacher (e.g., "Eyes on me in 3-2-1").',
      'Walk around during pair work to listen for misconceptions.',
    ],
    discussionHeading: 'Class Discussion Techniques',
    thinkPairShare: '<strong>Think-Pair-Share:</strong> Give students 30 seconds to think, 1 minute with a partner, then share with the class.',
    evidenceFirst: '<strong>Evidence First:</strong> Always ask "Which part of the article helps you?" before accepting answers.',
    coldCall: '<strong>Cold Call with Warm-Up:</strong> Let students discuss with a partner before calling on individuals.',
    noWrongInterest: '<strong>No Wrong Interest:</strong> When marking interest stars, reinforce that all responses are valid.',
    appAudioHeading: 'Using the App for Audio/QR Support',
    appAudioItems: [
      'Each article has a QR code linking to audio narration in the app.',
      'Use app audio for: first reading (Step 3), vocabulary pronunciation (Step 2), and homework review.',
      'Ensure QR codes are tested before class — have a backup plan if the app is unavailable.',
      'For schools without devices: the teacher can play audio from their phone through speakers.',
    ],
    blendedFlowHeading: 'Managing the Blended Learning Flow',
    blendedFlowItems: [
      'The workbook is the anchor. The app supports. Do not replace workbook time with screen time.',
      'App-based activities (extensive reading, AI writing feedback) are typically assigned as homework.',
      'In class, use the app only for: audio playback, QR demonstration, and progress tracker updates.',
      'When students receive AI writing feedback at home, discuss it as a class in Period 4 of the next lesson.',
    ],
  },

  // Flashcard games
  flashcardGames: {
    heading: 'Flashcard Vocabulary Games',
    intro: 'Vocabulary flashcards are included at the end of the student workbook. Each lesson has a set of cards with words on one side and definitions on the other.',
    period1Heading: 'Period 1: Cut-Out & Organization',
    period1Desc: 'Students cut out the cards for the current lesson and fold them along the center line. Have students organize cards by topic or alphabetically.',
    period24Heading: 'Periods 2-4: Vocabulary Games',
    period24Desc: 'Use one of these games as a 5-minute bell-ringer at the start of each period. Rotate through different games to keep engagement high.',
    memoryTitle: 'Memory Match',
    memoryDesc: 'Spread cards face-down. Students flip two at a time, trying to match words with their definitions. If they match, the student keeps the pair. Most pairs wins.',
    goFishTitle: 'Go Fish',
    goFishDesc: 'Distribute 4-5 cards per student. Students ask partners: "Do you have the definition of ___?" If the partner has it, they hand it over. If not, they say "Go fish!" Collect the most pairs to win.',
    snapTitle: 'Snap',
    snapDesc: 'Teacher reads definitions aloud one at a time. Students race to slap the matching word card on their desk. First to slap correctly keeps the card.',
    quizShowTitle: 'Quiz Show',
    quizShowDesc: 'Teacher gives definitions. Students hold up the correct word card. Fastest correct answer wins a point. Use for whole-class review.',
    moreGames: 'More game ideas: <strong>kidsclubenglish.com/small-group-card-games/</strong>',
  },

  // Spelling routine
  spellingRoutine: {
    heading: 'Spelling Routine Guide',
    intro: 'Spelling practice appears in the workbook for lessons 2, 3, and 4 of each week. The spelling section uses a three-period cycle that builds from tracing to independent writing.',
    traceTitle: 'Period 2: Trace',
    traceDesc: 'Students trace the vocabulary words using the light gray letters in the spelling practice section. Focus on correct letter formation and spacing. This is guided practice.',
    writeTitle: 'Period 3: Write',
    writeDesc: 'Students write the vocabulary words from memory in the "Write" column. They should look at the model word, cover it, then write. Check letter formation and accuracy.',
    coverWriteTitle: 'Period 4: Cover-and-Write',
    coverWriteDesc: 'Students cover the word model completely, then write the word from memory in the "Cover & Write" column. Uncover to check accuracy. This is the final assessment step.',
    note: '<strong>Note:</strong> Spelling practice appears in lessons 2, 3, and 4 of each week. Lesson 1 introduces new vocabulary but does not include spelling practice.',
  },

  // Goal setting
  goalSetting: {
    heading: 'My English Learning Goals',
    intro: 'At the beginning of each semester, introduce the "My English Learning Goals" page included at the front of the student workbook.',
    howToIntroduceHeading: 'How to Introduce Goal Setting',
    explainPurpose: '<strong>Explain the purpose:</strong> "This page helps you think about what you want to learn this semester."',
    modelGoal: '<strong>Model a goal:</strong> Write an example goal on the board (e.g., "I want to read 14 articles this semester").',
    guideGoalWriting: '<strong>Guide goal writing:</strong> Have students write 2-3 specific, achievable goals.',
    actionPlans: '<strong>Action plans:</strong> Help students write one action step for each goal.',
    revisit: '<strong>Revisit:</strong> At mid-semester, have students check their progress and adjust goals if needed.',
    categoriesHeading: 'Goal Categories',
    reading: '<strong>Reading:</strong> "I want to read ___ articles independently."',
    writing: '<strong>Writing:</strong> "I want to write ___ sentences without help."',
    vocabulary: '<strong>Vocabulary:</strong> "I want to learn ___ new words this semester."',
  },

  // Teaching notes section headers
  teachingNotes: {
    teacherActions: 'Teacher Actions',
    teacherLanguage: 'Teacher Language',
    studentActions: 'What Students Do',
    watchFor: 'Watch For',
  },

  // Step insert labels
  stepInsert: {
    studentView: 'Student View',
    step: 'Step',
    untitled: 'Untitled',
    noVocab: 'No vocabulary items',
    wordHeader: 'Word',
    phoneticHeader: 'Phonetic',
    meaningHeader: 'Meaning / Your Notes',
    interestLabel: 'Interest:',
    writeNewWords: 'Write important new words from the article:',
    word: 'Word',
    paraNumber: 'Para #',
    writeMainIdea: 'Write the main idea of each paragraph:',
    chooseSentences: 'Choose 2 sentences from the article:',
    grammar: 'Grammar',
    vocabulary: 'Vocabulary',
    usefulPhrase: 'Useful phrase',
    clue: 'Clue',
    question: 'Question',
    hint: 'Hint',
    sentenceStarters: 'Sentence starters:',
    matchWords: 'A. Match the Words',
    fillBlanks: 'B. Fill in the Blanks',
    putWordsInOrder: 'C. Put the Words in Order',
    completeSentence: 'D. Complete the Sentence',
    writingPrompt: 'Writing Prompt',
    plan: 'Plan:',
    sentenceFrames: 'Sentence frames:',
    draft: 'Draft:',
    writeLanguageQuestion: 'Write your language question:',
    articleImage: 'Article image',
    paragraphsTotal: (n: number) => `(${n} paragraphs total)`,
    paragraphs: (n: number) => `(${n} paragraphs)`,
    understood: 'I understood:',
    all: 'All',
    most: 'Most',
    some: 'Some',
    aLittle: 'A little',
    effortWas: 'My effort was:',
    great: 'Great',
    good: 'Good',
    okay: 'Okay',
    needsWork: 'Needs work',
    wantToLearn: 'I want to learn more about:',
    allOptions: ['All', 'Most', 'Some', 'A little'] as const,
    effortOptions: ['Great', 'Good', 'Okay', 'Needs work'] as const,
  },

  // Period plan labels
  periodPlan: {
    period: 'Period',
    bellRinger: 'Bell-Ringer',
    gameVariations: 'Game Variations:',
    spellingTitle: 'Spelling',
    onlineTitle: 'Online/App Components',
    launchVocabulary: 'Launch & Vocabulary',
    deepReadingComprehension: 'Deep Reading & Comprehension',
    responsePractice: 'Response & Practice',
    writingReflection: 'Writing & Reflection',
    // Bell-ringer activities
    flashcardCutout: 'Flashcard Cut-Out & Organization',
    flashcardCutoutInstructions: [
      'Students cut out the vocabulary flashcards from the end of the workbook.',
      'Have students organize cards by topic or alphabetically.',
      'Students can fold cards to create word/definition pairs.',
    ],
    flashcardGame: 'Flashcard Vocabulary Game',
    flashcardGameInstructions: [
      'Students take out their vocabulary flashcards from Period 1.',
      'Choose one game variation below for this period.',
      'Rotate through different games across periods 2-4 to keep engagement high.',
    ],
    fiveMinutes: '5 minutes',
    memoryMatch: 'Memory Match — Students flip two cards at a time, matching words to definitions.',
    goFish: 'Go Fish — Students ask partners: "Do you have the definition of ___?"',
    snap: 'Snap — Teacher reads definitions; students slap the matching word card.',
    quizShow: 'Quiz Show — Teacher gives definitions; students hold up the correct card.',
    // Spelling activities
    traceTitle: 'Spelling: Trace Activity',
    traceInstructions: 'Students trace the vocabulary words using the light gray letters in the spelling practice section. Focus on letter formation and spacing.',
    writeTitle: 'Spelling: Write Activity',
    writeInstructions: 'Students write the vocabulary words from memory in the "Write" column of the spelling practice section. Check letter formation.',
    coverWriteTitle: 'Spelling: Cover-and-Write Activity',
    coverWriteInstructions: 'Students cover the word model, then write it from memory in the "Cover & Write" column. Uncover to check accuracy.',
    // Online components
    onlineReading: 'App article reading: Students can scan the QR code to listen to the article at home or in class.',
    extensiveReading: 'Extensive reading: Assign additional reading via the app for homework.',
    vocabReview: 'App vocabulary/sentence review: Students review vocabulary and sentences in the app.',
    aiFeedback: 'AI writing feedback: Students submit their writing via the app for AI feedback. Discuss feedback in the next class.',
    progressTracker: 'Progress tracker: Students update their reading journey progress badge.',
  },

  // Lesson plan labels
  lessonPlan: {
    lesson: 'Lesson',
    genre: 'Genre',
    type: 'Type',
    cefr: 'CEFR',
    duration: 'Duration',
    durationValue: '4 periods (~40 min each)',
    objectives: 'Objectives',
    lessonVocabulary: 'Lesson Vocabulary',
    objectiveRead: (genre: string, title: string) =>
      `Read and understand a ${genre} text about ${title}`,
    objectiveVocab: 'Collect and practice key vocabulary from the article',
    objectiveComprehension: 'Demonstrate comprehension through multiple-choice and written responses',
    objectiveWriting: 'Write a guided response using planning tools and sentence frames',
    untitled: 'Untitled',
  },

  // End matter
  endMatter: {
    common: {
      tip: 'Tip',
      problem: 'Problem',
      solution: 'Solution',
    },
    selfAssessment: {
      heading: 'Self-Assessment Administration Guide',
      intro: 'The "My Learning Reflection" page at the end of the workbook helps students evaluate their own progress. Here\'s how to administer it effectively:',
      beforeHeading: 'Before Administering',
      beforeItems: [
        'Allow 10-15 minutes of quiet time for completion.',
        'Remind students this is about honest self-reflection, not a test.',
        'Have students review their completed workbook pages before starting.',
      ],
      duringHeading: 'During the Reflection',
      duringItems: [
        'Students rate themselves on reading, writing, and vocabulary skills.',
        'Students identify their strongest area and areas for improvement.',
        'Students set goals for the next workbook/semester.',
      ],
      afterHeading: 'After Completion',
      afterItems: [
        'Collect or have students keep their reflections as a portfolio piece.',
        'Use results to inform differentiated support in the next unit.',
        'Share common strengths with the class to build confidence.',
      ],
      tip: 'Do not grade the self-assessment. Its value is in the reflection process, not the score.',
    },
    certificate: {
      heading: 'Certificate Ceremony Guide',
      intro: 'The certificate of completion at the end of the workbook is a meaningful milestone for students. Here\'s how to present it effectively:',
      presentationTips: 'Presentation Tips',
      makeItSpecial: '<strong>Make it special:</strong> Set aside 10 minutes at the end of the final lesson for the ceremony.',
      personalize: '<strong>Personalize:</strong> Fill in the student\'s name before the ceremony.',
      signIt: '<strong>Sign it:</strong> Sign each certificate personally — students value a teacher\'s signature.',
      acknowledgeEffort: '<strong>Acknowledge effort:</strong> Briefly mention each student\'s specific achievement or improvement.',
      photoOp: '<strong>Photo opportunity:</strong> Allow students to take a photo with their certificate.',
      whatToSayHeading: 'What to Say',
      sayings: [
        '"You completed all 14 lessons. That takes dedication."',
        '"Look at how much vocabulary you learned."',
        '"Your writing has improved since Lesson 1."',
        '"I\'m proud of your effort this semester."',
      ],
      tip: 'For younger students, consider inviting another teacher or the principal to hand out certificates for extra impact.',
    },
    troubleshooting: {
      heading: 'Troubleshooting',
      pacingTitle: 'Student Pacing Issues',
      pacingProblem: 'Some students finish much faster than others.',
      pacingSolutions: [
        'Early finishers can: re-read the article, help a partner, review flashcards, or start the spelling practice.',
        'For slower students: reduce the number of vocabulary collection boxes required (e.g., 2 instead of 4).',
        'Never skip steps — shorten them instead.',
      ],
      appTitle: 'App/QR Code Issues',
      appProblem: "QR code doesn't work or students don't have devices.",
      appSolutions: [
        'Test all QR codes before class.',
        "Play audio from the teacher's phone through classroom speakers as a backup.",
        'If devices are unavailable, the teacher reads the article aloud and skips app-based homework.',
        'Assign extensive reading as optional homework for students with app access.',
      ],
      writingTitle: 'Writing Step Too Difficult',
      writingProblem: 'Students struggle with Step 11 (Guided Writing).',
      writingSolutions: [
        'Model the planner on the board before students begin.',
        'Provide additional sentence frames if needed.',
        'Allow students to write 3-4 sentences instead of a full paragraph.',
        'Pair stronger and weaker writers for peer support.',
      ],
      engagementTitle: 'Low Engagement During Flashcard Games',
      engagementProblem: 'Students lose interest in flashcard games.',
      engagementSolutions: [
        'Rotate through different games (Memory, Go Fish, Snap, Quiz Show).',
        'Add a small reward for the winning pair (e.g., choosing the next game).',
        'Limit game time to 5 minutes — short and energetic.',
        'If a class dislikes card games, use the flashcards for a quick oral quiz instead.',
      ],
      aiTitle: 'AI Writing Feedback Confusion',
      aiProblem: "Students don't understand the AI feedback they received at home.",
      aiSolutions: [
        "In Period 4, project one student's feedback (with permission) and discuss it as a class.",
        'Teach students to focus on 1-2 pieces of feedback, not everything at once.',
        'Remind students: AI feedback is a suggestion, not a grade.',
        'The teacher always has the final say on writing quality.',
      ],
    },
  },

  // Document wrapper
  documentWrapper: {
    titlePrefix: "Teacher's Manual",
    pageCounter: 'Page',
  },

  // Teaching notes content for all 13 steps
  teachingNotesContent: {
    1: {
      teacherActions: [
        'Project the lesson title and image on the screen',
        'Ask students to look at the page before discussing',
        'Direct students to mark their interest level with the stars',
      ],
      teacherLanguage: [
        '"Look first."',
        '"How interested are you in this topic?"',
        '"Show me your interest. There is no wrong answer."',
      ],
      studentActions: [
        'Mark the interest stars',
        'Respond to the optional thinking prompt if present',
      ],
      watchFor: [
        'Students waiting instead of writing',
        'Students trying to jump ahead to reading',
      ],
    },
    2: {
      teacherActions: [
        'Say each word clearly and model pronunciation',
        'Play audio pronunciation if available via the app',
        'Confirm meaning simply — avoid over-explaining',
        'Have students use the second column for translation, drawing, or a simple sentence',
      ],
      teacherLanguage: [
        '"Say it with me. Now show the meaning in your own way."',
        '"Listen. Repeat. Then write or draw to help you remember."',
      ],
      studentActions: [
        'Repeat pronunciation',
        'Write a translation, draw a picture, or write a simple sentence in the second column',
      ],
      watchFor: [
        'Students copying definitions word-for-word instead of using their own words',
        'Students rushing without confirming understanding',
      ],
    },
    3: {
      teacherActions: [
        'Use the QR code or app audio to support reading',
        'During first pass: keep the flow smooth, do not stop',
        'During second pass: encourage students to mark new words, confusing parts, interesting parts',
        'Project the article on screen for whole-class reading',
      ],
      teacherLanguage: [
        '"First we follow the story. Later we stop and notice details."',
        '"Listen and follow first. Then we will read more carefully."',
      ],
      studentActions: [
        'Track paragraphs while listening/reading',
        'Mark new words, confusing parts, interesting parts, and sentences worth saving',
      ],
      watchFor: [
        'Students not tracking the text',
        'Students marking too many things (limit to 3-4 per category)',
      ],
    },
    4: {
      teacherActions: [
        'Model choosing a useful word and its paragraph number',
        'Remind students: the page gives 4 collection boxes — do not require more',
        'Walk around to check students are choosing words from the article',
      ],
      teacherLanguage: [
        '"Choose the words that are important for you, then write the paragraph number."',
        '"Write important new words from the article."',
      ],
      studentActions: [
        'Transfer key new words from the article into the workbook',
        'Write the paragraph number where each word appears',
      ],
      watchFor: [
        'Students choosing words they already know',
        'Students leaving the paragraph number blank',
      ],
    },
    5: {
      teacherActions: [
        'Read paragraph by paragraph, pausing after each',
        'Ask students: "What is this paragraph mostly about?"',
        'Keep responses short and concrete — one main idea per paragraph',
      ],
      teacherLanguage: [
        '"Read again carefully. Write the main idea of each paragraph."',
        '"What is this paragraph mostly about?"',
      ],
      studentActions: [
        'Re-read each paragraph carefully',
        'Write one main idea for each paragraph in the notes area',
      ],
      watchFor: [
        'Students copying full sentences instead of writing main ideas',
        'Students writing too much — keep it to one line per paragraph',
      ],
    },
    6: {
      teacherActions: [
        'Model how to choose a sentence and explain why',
        'Remind students: choose 2 sentences, use the checkbox labels (grammar, vocabulary, useful phrase)',
        'Have students share one sentence with a partner',
      ],
      teacherLanguage: [
        '"Choose two sentences that will help your English later."',
        '"Choose 2 sentences you want to study."',
      ],
      studentActions: [
        'Select 2 sentences from the article',
        'Copy them into the workbook',
        'Check the reason box (grammar, vocabulary, or useful phrase)',
      ],
      watchFor: [
        'Students choosing very short or unhelpful sentences',
        'Students forgetting to check the reason box',
      ],
    },
    7: {
      teacherActions: [
        'Read each question aloud',
        'Let students think before discussing',
        'Discuss evidence before they mark answers',
        'Require students to write one clue from the article',
      ],
      teacherLanguage: [
        '"Which part of the article helps you know the answer?"',
        '"Think first, then discuss with your partner, then answer."',
      ],
      studentActions: [
        'Read each question and find evidence in the article',
        'Discuss with a partner',
        'Mark the answer and write one clue from the article',
      ],
      watchFor: [
        'Students rushing to answer without finding evidence',
        'Students not writing the clue line',
      ],
    },
    8: {
      teacherActions: [
        'Model using the question, hint, sentence starters, and guided frame',
        'Remind students: answer in complete sentences, use the article',
        'This is a supported written response — not a perfect essay',
      ],
      teacherLanguage: [
        '"Answer in complete sentences. Use the article."',
        '"Use the article. Use the frame. Write a real answer, not one word."',
      ],
      studentActions: [
        'Use the short answer hint and sentence starters',
        'Write a supported, text-based response in complete sentences',
        'Self-check their work',
      ],
      watchFor: [
        'Students writing one-word answers',
        'Students not referring back to the article',
      ],
    },
    9: {
      teacherActions: [
        'Students complete A. Match the Words and B. Fill in the Blanks',
        'Keep the work brisk — this is not the moment for long explanations',
        'Check answers briefly as a class if time allows',
      ],
      teacherLanguage: [
        '"Use the word bank carefully. Check your answers."',
      ],
      studentActions: [
        'Complete the vocabulary matching activity',
        'Complete the fill-in-the-blank activity',
      ],
      watchFor: [
        'Students guessing instead of using context',
        'Students struggling with the word bank — provide hints, not answers',
      ],
    },
    10: {
      teacherActions: [
        'Model one item if needed, then release students to work',
        'Students complete C. Put the Words in Order and D. Complete the Sentence',
        'Walk around and check progress',
      ],
      teacherLanguage: [
        '"Model one if you need help, then try the rest on your own."',
      ],
      studentActions: [
        'Complete the word order activity',
        'Complete the sentence completion prompts',
      ],
      watchFor: [
        'Students putting words in an order that almost works but changes meaning',
        'Students not using capital letters or periods',
      ],
    },
    11: {
      teacherActions: [
        'Teach the writing sequence exactly as printed: read prompt → plan → sentence frames → draft → self-check',
        'Model the planner before students begin',
        'Remind: "The planner comes first. The draft comes second."',
        'If a writing QR code is available, frame it as after planning and drafting, never before',
      ],
      teacherLanguage: [
        '"Plan first. Then draft."',
        '"The planner comes first. The draft comes second."',
        '"Use the planner. Use the sentence frames. Write, then check."',
      ],
      studentActions: [
        'Read the writing prompt',
        'Complete the planner',
        'Use the sentence frames',
        'Write the draft',
        'Self-check using the checklist',
      ],
      watchFor: [
        'Students skipping the planner and going straight to drafting',
        'Students not using the sentence frames',
        'Step 11 is height-sensitive in print — watch for content overflow',
      ],
    },
    12: {
      teacherActions: [
        'Collect student language questions first — write before AI',
        'Select a few questions and use AI support carefully (teacher-mediated)',
        'Do not let students interact with AI directly in this step',
      ],
      teacherLanguage: [
        '"Write the question clearly first. Then we can ask for help."',
        '"Write first, AI second."',
      ],
      studentActions: [
        'Write language questions clearly',
        'Record the AI-assisted answers provided by the teacher',
      ],
      watchFor: [
        'Students writing vague or unclear questions',
        'Over-reliance on AI without first attempting their own answer',
      ],
    },
    13: {
      teacherActions: [
        'Close the lesson with the reflection prompt',
        'Have students complete: understanding rating, effort rating, interest/follow-up prompts',
        'Remind students about homework on the same page',
        'Do not let students pack up before finishing reflection',
      ],
      teacherLanguage: [
        '"Finish the reflection before you pack up. This is part of the lesson."',
      ],
      studentActions: [
        'Complete the reflection prompt',
        'Rate understanding and effort',
        'Note homework and next steps',
      ],
      watchFor: [
        'Students rushing through reflection',
        'Students skipping the homework reminder',
      ],
    },
  },
};
