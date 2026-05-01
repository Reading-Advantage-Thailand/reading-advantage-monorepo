import { Card as FSRSCard, State, Rating } from "ts-fsrs";
import { Prisma } from "@prisma/client";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  link: {
    github: string;
  };
  navItems?: {
    href: string;
    label: string;
    icon?: string;
  }[];
};

export type MainNavItem = {
  title: "home" | "about" | "contact" | "authors";
  href: string;
  disabled?: boolean;
  icon?: string;
};

export type NavLink = {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  // Permission requirements for this navigation link
  requiredPermissions?: import("@/lib/permissions").Permission[];
  // Whether to hide completely when no permission (default: false, shows as locked)
  hideWhenNoPermission?: boolean;
};

export type PageConfig = {
  mainNav: MainNavItem[];
  sidebarNav?: SidebarNavItem[];
};

export type SidebarNavItem = {
  id?: string;
  title: string;
  disabled?: boolean;
  external?: boolean;
  icon?: string;
  // Permission requirements for this navigation item
  requiredPermissions?: import("@/lib/permissions").Permission[];
  // Whether to hide completely when no permission (default: false, shows as locked)
  hideWhenNoPermission?: boolean;
} & (
  | {
      href: string;
      items?: never;
    }
  | {
      href?: string;
      items: NavLink[];
    }
);

export interface ArticleShowcase {
  rating?: number;
  cefrLevel?: string;
  id: string;
  raLevel?: number;
  summary?: string;
  translatedSummary?: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  title: string;
  is_read?: boolean;
  is_completed?: boolean;
  is_approved?: boolean;
  type?: string;
  subGenre?: string | null;
  genre?: string | null;
  storyBible?: StoryBible;
}

export interface Article {
  summary: string;
  translatedSummary: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  } | null;
  translatedPassage: {
    th: string[];
    cn: string[];
    tw: string[];
    vi: string[];
  } | null;
  imageDescription: string;
  passage: string;
  createdAt: Date;
  rating: number;
  sentences?: SentenceTimepoint[];
  words?: WordListTimestamp[];
  type: string;
  title: string;
  cefrLevel: string;
  raLevel: number;
  subGenre?: string | null;
  genre: string;
  id: string;
  audioUrl?: string;
  audioWordUrl?: string;
  read_count?: number;
  WordList?: WordList[];
  multipleChoiceQuestions?: MCQuestion[];
  shortAnswerQuestions?: SAQuestion[];
  longAnswerQuestions?: LAQuestion[];
  sentencsAndWordsForFlashcard?: SentencsAndWordsForFlashcard[];
}

export interface WordList {
  id: string;
  wordlist: string[];
  timepoints: Prisma.JsonValue | Timepoint[];
  articleId: string;
}

export interface MCQuestion {
  id: string;
  question: string;
  articleId: string;
  storyChapterId?: string;
  options?: string[];
  answer?: string;
  textualEvidence?: string;
}

export interface SAQuestion {
  id: string;
  question: string;
  articleId: string;
  storyChapterId?: string;
  answer?: string;
}
export interface LAQuestion {
  id: string;
  question: string;
  articleId: string;
  storyChapterId?: string;
}

export interface SaveSentenceAndWordFlashcard {
  sentences: SaveSentence[];
  words: WordListTimestamp[];
}

interface TimePoint {
  timeSeconds: number;
  markName: string;
  index?: number;
  file?: string;
  sentences?: string;
}

export interface WordListTimestamp {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface SentenceTimepoint {
  startTime: number;
  endTime: number;
  words: WordTimestamp[];
  sentence: string;
  translations?: {
    th?: string;
    cn?: string;
    tw?: string;
    vi?: string;
    en?: string;
  };
}

export interface QuestionResponse {
  questions: MCQuestion[] | SAQuestion | LAQuestion;
  result?: QuestionResult;
  questionStatus?: QuestionState | QuestionState.INCOMPLETE;
}

export interface QuestionResult {
  details: {
    question?: string;
    suggestedAnswer?: string;
    feedback?: string;
    yourAnswer?: string;
    score?: number;
    responses?: string[];
    timer?: number;
  };
  completed: boolean;
}

export interface SAQFeedbackResponse {
  score: number;
  feedback: string;
}

export interface LAQFeedbackResponse {
  score: number;
  feedback: LAQFeedback;
}

export interface LAQFeedback {
  detailedFeedback: {
    [key: string]: {
      areasForImprovement: string;
      examples: string;
      strengths: string;
      suggestions: string;
    };
  };
  score: {
    [key: string]: number;
  };
  overallImpression: string;
  exampleRevisions: string;
  nextSteps?: string[];
}

export interface FlashcardCard extends Omit<FSRSCard, "due" | "last_review"> {
  id: string;
  deckId: string;
  type: FlashcardType;
  articleId?: string;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;

  // Content fields
  word?: string;
  definition?: MultiLanguageText;
  sentence?: string;
  translation?: MultiLanguageText;
  context?: string;

  // ts-fsrs fields (with proper types)
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;

  createdAt: Date;
  updatedAt: Date;
  reviews?: CardReview[];
}

export interface MultiLanguageText {
  en?: string;
  th: string;
  cn: string;
  tw: string;
  vi: string;
}

export interface CardReview {
  id: string;
  cardId: string;
  rating: Rating; // ts-fsrs Rating enum (1-4)
  timeSpent?: number;
  reviewedAt: Date;
}

export interface UserActivityLog {
  id: string;
  userId: string;
  activityType: string;
  targetId?: string | null;
  details: any;
  completed: boolean;
  createdAt: Date;
}

export interface UserXpLog {
  id: string;
  userId: string;
  xpEarned: number;
  createdAt: Date;
}

// Teacher API Types
export interface TeacherData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  image?: string | null;
  schoolId?: string | null;
  cefrLevel?: string | null;
  totalStudents: number;
  totalClasses: number;
  assignedClassrooms?: Array<{
    id: string;
    name: string;
    grade?: string | null;
  }>;
}

export interface TeachersResponse {
  teachers: TeacherData[];
  statistics: {
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    averageStudentsPerTeacher: number;
    activeTeachers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTeacherRequest {
  name: string;
  email: string;
  role: "teacher" | "admin";
  cefrLevel?: string;
  classroomIds?: string[];
  password?: string;
}

export interface UpdateTeacherRequest {
  name?: string;
  email?: string;
  role?: "teacher" | "admin";
  cefrLevel?: string;
  classroomIds?: string[];
  password?: string;
}

export interface TeacherApiResponse {
  success: boolean;
  teacher?: TeacherData;
  error?: string;
}

// Additional types for MVC architecture
export interface UserWithRoles {
  id: string;
  email: string | null;
  schoolId: string | null;
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  SchoolAdmins: Array<{
    id: string;
    schoolId: string;
  }>;
}

// Student API Types
export interface StudentData {
  id: string;
  name: string | null;
  email: string | null;
  cefrLevel: string | null;
  xp: number;
  role: string;
  createdAt: string;
  className: string | null;
  classroomId: string | null;
}

export interface StudentsResponse {
  students: StudentData[];
  statistics: {
    totalStudents: number;
    averageXp: number;
    mostCommonLevel: string;
    activeThisWeek: number;
    activePercentage: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Input types for creating/updating
export interface CreateTeacherInput {
  name: string;
  email: string;
  role: string;
  cefrLevel?: string;
  password?: string;
  classroomIds?: string[];
}

export interface UpdateTeacherInput {
  name?: string;
  email?: string;
  role?: string;
  cefrLevel?: string;
  password?: string;
  classroomIds?: string[];
}

export interface CreateStudentInput {
  name: string;
  email: string;
  cefrLevel?: string;
  classroomId?: string;
  password?: string;
}

export interface UpdateStudentInput {
  name?: string;
  email?: string;
  cefrLevel?: string;
  classroomId?: string;
  password?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface License {
  id: string;
  school_name: string;
  subscription_level: "basic" | "premium" | "enterprise";
  amount: number;
  status: "active" | "inactive" | "expired";
  active_users: number;
  expiry_date: string;
  email: string;
}

// Re-export ts-fsrs types for convenience
export { Rating, State as FSRSState } from "ts-fsrs";

export interface Assignment {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  classroomId: string;
  articleId: string;
  teacherId: string;
  teacherName: string;
  dueDate: Date;
  AssignmentStudent?: AssignmentStudent[] | null;
  article?: Article | null;
  classroom?: Classroom | null;
}

export interface AssignmentStudent {
  id: string;
  assignmentId: string;
  studentId: string;
  status: AssignmentStatus;
  startedAt: Date;
  completedAt: Date;
  assignment?: Assignment | null;
  student?: User | null;
}

export interface Classroom {
  id: string;
  name: string;
  classCode: string;
  codeExpiresAt: Date;
  grade: string;
  passwordStudents: string;
  schoolId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArticleResponse {
  id: string;
  title: string;
  summary: string;
  translatedSummary: Record<string, string> | null;
  passage: string;
  translatedPassage: Record<string, string[]> | null;
  audioUrl: string;
  sentences: {
    words: {
      word: string;
      start: number;
      end: number;
    }[];
    sentence: string;
    startTime: number;
    endTime: number;
  }[];
  genre: string;
  subGenre: string | null;
  type: string;
  raLevel: number;
  cefrLevel: string;
  rating: number;
  flashcard: {
    words: {
      vocabulary: string;
      definition: {
        en: string;
        th: string;
        cn: string;
        tw: string;
        vi: string;
      };
      startTime: number;
      endTime: number;
      audioUrl: string;
    }[];
    sentences: {
      sentence: string;
      translation: {
        th: string;
        cn: string;
        tw: string;
        vi: string;
      };
      startTime: number;
      endTime: number;
      audioUrl: string;
    }[];
  };
}
