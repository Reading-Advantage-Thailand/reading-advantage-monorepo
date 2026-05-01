// import { EnumValues } from "zod";

export type SiteConfig = {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  link: {
    github: string;
  };
};
export type MainNavItem = NavItem;

export type NavItem = {
  title: "home" | "about" | "contact" | "authors";
  href: string;
  disabled?: boolean;
};

export type IndexPageConfig = {
  mainNav: MainNavItem[];
};

export type StudentPageConfig = {
  mainNav: MainNavItem[];
  sidebarNav: sidebarNav[];
};

export type TeacherPageConfig = {
  mainNav: MainNavItem[];
  teacherSidebarNav: teacherSidebarNav[];
};

export type AdminPageConfig = {
  mainNav: MainNavItem[];
  sidebarNav: sidebarNav[];
};

export type SystemPageConfig = {
  mainNav: MainNavItem[];
  systemSidebarNav: systemSidebarNav[];
};

export type SidebarNavItem = {
  id?: string;
  title:
    | "read"
    | "stories"
    | "sentences"
    | "vocabulary"
    | "reports"
    | "history"
    | "assignments";
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof Icons;
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

export type SidebarTeacherNavItem = {
  title:
    | "myClasses"
    | "myStudents"
    | "classRoster"
    | "reports"
    | "passages"
    | "assignments";
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof Icons;
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
export type SystemSidebarNavItem = {
  title:
    | "System Dashboard"
    | "Schools Dashboard"
    | "Handle Passages"
    | "License"
    | "Reports";
  disabled?: boolean;
  external?: boolean;
  icon?: keyof typeof Icons;
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

import { Role } from "@prisma/client";

export type User = {
  id: string;
  name: string;
  email: string;
  picture?: string;
  createAt: Date;
  lastLogin: Date;
  level: number;
  role: Role;
};

// multiple choice question type
export type Question = {
  question: string;
  descriptor_id: string;
  answers: string[];
};

// article table type
export type ArticleRecord = {
  id: string;
  targetId?: string;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  articleId: string;
  userId: string;
  timeRecorded: number;
  questions: any[];
  userLevel?: number;
  updatedLevel?: number;
  calculatedLevel?: number;
  rating: number;
  score: number;
  title: string;
  status: RecordStatus;
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
};

export type WithChildren<T = unknown> = T & { children: React.ReactNode };

export type LocaleLayoutParams = { params: { locale: string } };

export type QuestionsType = {
  mcqs: MCQType[];
  shortAnswer: ShortAnswerType;
};

export type MCQType = {
  question: string;
  descriptor_id: string;
  answers: string[];
};

export type ShortAnswerType = {
  question: string;
  suggestedAnswer: string;
};

export type MCQRecordType = {
  descriptorId: string;
  timeLogged: number;
  isCorrect: boolean;
};
export type ShortAnswerRecordType = {
  answer: string;
  timeLogged: number;
};
// user article record type
export type UserArticleRecordType = {
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  };
  articleId: string;
  userId: string;
  status: RecordStatus;
  questions: MCQRecordType[];
  timeRecorded: number;
  short_answer: ShortAnswerRecordType;
  rating: number;
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  };
};

//Article type
export type ArticleType = {
  id: string;
  ari: number;
  cefrLevel: string;
  cefrScores: {
    A1: number;
    A2: number;
    B1: number;
    B2: number;
    C1: number;
    C2: number;
  };
  content: string;
  genre: string;
  grade: number;
  raLevel: number;
  subGenre: string;
  title: string;
  topic: string;
  type: string;
  timepoints: [
    {
      timeSeconds: number;
      markName: string;
    },
  ];
  questions: QuestionsType;
  averageRating: number;
  totalRatings: number;
};

export type articleShowcaseType = {
  // articleId: string,
  // title: string,
  type: string;
  genre: string;
  subgenre: string;
  // raLevel: number,
  // cefrLevel: string,
  // summary: string,
  // isRead: boolean,
  // status: RecordStatus,
  // averageRating: number,
  // totalRatings: number,
  // topic: string,
  // readCount: number
  average_rating: number;
  cefr_level: string;
  id: string;
  ra_level: string;
  summary: string;
  title: string;
  is_read: boolean;
  is_approved: boolean;
};

// CSS Module declarations
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}
