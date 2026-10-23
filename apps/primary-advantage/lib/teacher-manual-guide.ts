import type { ManualFigureId } from "./teacher-manual-figures";

/**
 * The live labels that the manual text names, by placeholder (`<ui>{startClass}</ui>`): the message
 * key of the label on the screen, and the values of a label with placeholders. The manual builds
 * each name from the live key, so the manual stays right when a label changes (S5 request A.1).
 * `blank` is the number in `values` that the manual shows as "…" (a label with an ICU plural).
 */
export const MANUAL_LABELS = {
  teacherTab: { key: "AuthPage.signin.teacher" },
  studentTab: { key: "AuthPage.signin.student" },
  username: { key: "AuthPage.staff.username" },
  password: { key: "AuthPage.staff.password" },
  signIn: { key: "AuthPage.staff.submit" },
  staffHelp: { key: "AuthPage.staff.help" },
  setNewPassword: { key: "AuthPage.temporary.title" },
  newPassword: { key: "AuthPage.temporary.newPassword" },
  confirmPassword: { key: "AuthPage.temporary.confirm" },
  saveAndSignIn: { key: "AuthPage.temporary.save" },
  home: { key: "Sidebar.home" },
  myClasses: { key: "Sidebar.myClasses" },
  myStudents: { key: "Sidebar.myStudents" },
  reports: { key: "Sidebar.reports" },
  assignments: { key: "Sidebar.assignments" },
  manual: { key: "Sidebar.manual" },
  startClassLink: { key: "TeacherUi.startClass" },
  classCard: { key: "ClassLogin.title" },
  startClass: { key: "ClassLogin.session.start" },
  classCode: { key: "ClassLogin.session.codeLabel" },
  studentCode: { key: "StudentSignIn.code.label" },
  signedInCount: { key: "ClassLogin.roster.summary", values: { signedIn: "…", total: "…" } },
  endClass: { key: "ClassLogin.session.end" },
  newCode: { key: "ClassLogin.session.newCode" },
  pictureSetting: { key: "ClassLogin.setting.label" },
  students: { key: "ClassLogin.roster.heading" },
  resetPictures: { key: "ClassLogin.roster.resetPicture" },
  setPictures: { key: "ClassLogin.roster.setPicture" },
  newCard: { key: "ClassLogin.roster.newCard" },
  studentNewPassword: { key: "ClassLogin.roster.newPassword" },
  passwordConfirmTitle: { key: "ClassLogin.password.title", values: { name: "…" } },
  passwordConfirm: { key: "ClassLogin.password.confirm" },
  passwordPrint: { key: "ClassLogin.password.print" },
  classSheet: { key: "ClassLogin.links.classSheet" },
  qrCards: { key: "ClassLogin.links.qrCards" },
  makeSheet: { key: "ClassLogin.sheet.make" },
  sheetConfirmTitle: { key: "ClassLogin.sheet.confirmTitle" },
  sheetConfirm: { key: "ClassLogin.sheet.confirm" },
  print: { key: "ClassLogin.sheet.print" },
  issueCards: { key: "ClassLogin.qrPage.issue", values: { count: 7 }, blank: "7" },
  printCards: { key: "ClassLogin.qrPage.print" },
  noBook: { key: "TeacherUi.classBook.none" },
  book: { key: "TeacherUi.classBook.book" },
  mode: { key: "TeacherUi.classBook.mode" },
  teacherLed: { key: "TeacherUi.classBook.modeTeacherLed" },
  independent: { key: "TeacherUi.classBook.modeIndependent" },
  startDate: { key: "TeacherUi.classBook.startDate" },
  assignBook: { key: "TeacherUi.classBook.assignButton" },
  bookAssigned: { key: "TeacherUi.classBook.assigned" },
  emptyCatalogue: { key: "TeacherUi.classBook.emptyCatalogueTitle" },
  nowInClass: { key: "TeacherUi.classBook.nowInClass" },
  nextStep: { key: "TeacherUi.classBook.nextStep" },
  openLesson: { key: "TeacherUi.classBook.openLesson" },
  lessonPlan: { key: "TeacherUi.classBook.pacing" },
  live: { key: "TeacherUi.classBook.guide.live" },
  tip: { key: "TeacherUi.classBook.guide.tip" },
  guideTitle: { key: "TeacherUi.classBook.guide.title" },
  teacherActions: { key: "TeacherUi.classBook.guide.teacherActions" },
  teacherLanguage: { key: "TeacherUi.classBook.guide.teacherLanguage" },
  studentActions: { key: "TeacherUi.classBook.guide.studentActions" },
  watchFor: { key: "TeacherUi.classBook.guide.watchFor" },
  script: { key: "TeacherUi.classBook.guide.script" },
  markDone: { key: "TeacherUi.classBook.guide.markDone" },
  undo: { key: "TeacherUi.classBook.guide.undo" },
  next: { key: "TeacherUi.classBook.lesson.next" },
  projector: { key: "TeacherUi.classBook.lesson.projector" },
  showAnswer: { key: "TeacherUi.classBook.lesson.showAnswer" },
  lockedText: { key: "StudentHome.classBookLocked" },
  classProgress: { key: "TeacherUi.classBook.progress.open" },
  legend: { key: "TeacherUi.classBook.progress.legend" },
  markTaught: { key: "TeacherUi.classBook.markTaught" },
  rehearsal: { key: "TeacherUi.classBook.lesson.rehearsal" },
  printLesson: { key: "TeacherUi.classBook.lesson.print" },
  teachAgain: { key: "TeacherUi.classBook.teachAgain" },
  newAssignment: { key: "TeacherAssignments.newAssignment" },
  assignButton: { key: "Components.assignments" },
  createAssignment: { key: "Assignment.title" },
  classroom: { key: "Assignment.assignForm.classroom" },
  assignmentName: { key: "Assignment.assignForm.name" },
  assignmentDescription: { key: "Assignment.assignForm.description" },
  studentsField: { key: "Assignment.assignForm.students" },
  selectAll: { key: "Assignment.assignForm.selectAllStudents" },
  dueDate: { key: "Assignment.assignForm.dueDate" },
  submit: { key: "Components.submitButton" },
  saved: { key: "Assignment.saved" },
  todayLesson: { key: "StudentHome.todayLesson" },
  myWork: { key: "StudentAssignments.title" },
} as const satisfies Record<string, { key: string; values?: Record<string, string | number>; blank?: string }>;

/** Where a section's link button goes: a fixed page, or a part of the teacher's class page. */
export type ManualLink = { page: string } | { classAnchor: string };

/** One part of a manual section, in page order. Keys are under `TeacherManual.<section>`. */
export type ManualBlock =
  | { kind: "steps"; title?: string; intro?: string; start: number; steps: { key: string; figure?: ManualFigureId | ManualFigureId[] }[] }
  | { kind: "note"; key: string; tone?: "warn"; figure?: ManualFigureId }
  | { kind: "list"; title: string; keys: string[]; tone?: "warn"; plain?: boolean; figure?: ManualFigureId }
  | { kind: "classSheetCase" };

/** One numbered section of the manual, with its anchor for links from other pages. */
export interface ManualSection {
  id: string;
  /** Message group under `TeacherManual`. */
  key: string;
  number: string;
  lead?: boolean;
  link?: ManualLink;
  /** The registry id of the help video for the section; "Watch the video" opens it (FR-10). */
  video?: string;
  blocks: ManualBlock[];
}

/**
 * Which class sheet text section 6 shows (cutover step C14): "A" when the team handed out the class
 * sheets, "B" when no class has a sheet yet, "both" for a draft. "B" is the default that PR recorded on
 * 2026-10-21 (the cutover records say the hand-out is still open); Daniel can change it.
 */
export const CLASS_SHEET_CASE: "A" | "B" | "both" = "B";

/** The six sections of the teacher manual (S5 request A.3, PR draft v0.1 of 2026-10-20). */
export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "signin",
    video: "B5",
    key: "signin",
    number: "1",
    lead: true,
    blocks: [
      { kind: "steps", start: 1, steps: [{ key: "step1" }, { key: "step2" }, { key: "step3", figure: "signin" }] },
      { kind: "note", key: "oldSystem" },
      { kind: "steps", title: "firstTitle", start: 4, steps: [{ key: "step4" }, { key: "step5", figure: "newPassword" }] },
      { kind: "note", key: "rule" },
      { kind: "note", key: "forgot", tone: "warn" },
    ],
  },
  {
    id: "class",
    video: "E2",
    key: "class",
    number: "2",
    lead: true,
    link: { page: "/teacher/my-classes" },
    blocks: [
      { kind: "steps", start: 1, steps: [{ key: "step1", figure: "menu" }, { key: "step2", figure: "myClasses" }] },
      { kind: "list", title: "menuTitle", keys: ["menu", "phone"], plain: true },
      { kind: "note", key: "shortcut" },
    ],
  },
  {
    id: "start-class",
    video: "B3",
    key: "startClass",
    number: "3",
    lead: true,
    link: { classAnchor: "#class-login" },
    blocks: [
      {
        kind: "steps",
        start: 1,
        steps: [{ key: "step1", figure: "classCard" }, { key: "step2", figure: "classStarted" }, { key: "step3" }, { key: "step4" }],
      },
      { kind: "note", key: "newCode" },
      { kind: "note", key: "pictureSetting" },
      { kind: "list", title: "helpTitle", keys: ["help1", "help2", "help3"], tone: "warn", figure: "roster" },
    ],
  },
  {
    id: "assign-book",
    video: "D2",
    key: "assignBook",
    number: "4.1",
    lead: true,
    link: { classAnchor: "#class-book" },
    blocks: [
      { kind: "steps", start: 1, steps: [{ key: "step1" }, { key: "step2" }, { key: "step3" }, { key: "step4", figure: "assignBook" }] },
      { kind: "note", key: "modeNote" },
      { kind: "note", key: "emptyNote" },
    ],
  },
  {
    id: "lesson",
    video: "D3",
    key: "lesson",
    number: "4.2",
    lead: true,
    link: { classAnchor: "#class-book" },
    blocks: [
      {
        kind: "steps",
        start: 1,
        steps: [{ key: "step1", figure: "classBook" }, { key: "step2", figure: "lessonGuide" }, { key: "step3" }, { key: "step4", figure: "projector" }],
      },
      { kind: "note", key: "markAll", tone: "warn" },
      { kind: "note", key: "steps13" },
    ],
  },
  {
    id: "after-lesson",
    video: "D6",
    key: "afterLesson",
    number: "4.3",
    blocks: [
      { kind: "steps", start: 1, steps: [{ key: "step1", figure: "lessonPlan" }, { key: "step2", figure: "markTaught" }] },
      { kind: "note", key: "colors", figure: "progressGrid" },
      { kind: "list", title: "buttonsTitle", keys: ["rehearsal", "print", "teachAgain"] },
    ],
  },
  {
    id: "homework",
    video: "E4",
    key: "homework",
    number: "5",
    lead: true,
    link: { page: "/teacher/assignments" },
    blocks: [
      {
        kind: "steps",
        start: 1,
        steps: [{ key: "step1", figure: "assignments" }, { key: "step2" }, { key: "step3", figure: "articleAssign" }, { key: "step4", figure: ["assignForm", "assignDue"] }, { key: "step5" }],
      },
      { kind: "note", key: "studentsSee" },
      { kind: "note", key: "atHome", tone: "warn" },
    ],
  },
  {
    id: "class-sheet",
    video: "B4",
    key: "classSheet",
    number: "6",
    lead: true,
    link: { classAnchor: "#class-login" },
    blocks: [
      { kind: "classSheetCase" },
      { kind: "note", key: "sheetIntro" },
      { kind: "note", key: "warning", tone: "warn" },
      { kind: "note", key: "oneStudent" },
      { kind: "steps", start: 1, steps: [{ key: "step1", figure: "classSheet" }, { key: "step2", figure: "classSheetConfirm" }, { key: "step3" }] },
      { kind: "list", title: "forgotTitle", keys: ["forgot"] },
      { kind: "steps", title: "qrTitle", intro: "qrLead", start: 4, steps: [{ key: "step4", figure: "qrCards" }, { key: "step5" }] },
      { kind: "note", key: "lostCard", figure: "newCardConfirm" },
    ],
  },
];
