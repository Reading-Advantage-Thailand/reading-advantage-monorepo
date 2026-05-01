export enum RecordStatus {
  UNCOMPLETED_MCQ = "uncompletedMCQ",
  UNCOMPLETED_SHORT_ANSWER = "uncompletedShortAnswer",
  UNRATED = "unrated",
  COMPLETED = "completed",
}

export enum ScoreRange {
  A0 = "10-15",
  A1 = "16-22",
  'A1+' = "23-29",
  A2 = "30-35",
  'A2+' = "36-42",
  B1 = "43-50",
  "B1+" = "51-57",
  B2 = "58-64",
  "B2+" = "65-71",
  C1 = "72-78",
 "C1+" = "79-85",
  C2 = "86-90",
}

export enum UserRole {
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMINISTRATOR",
  // SYSTEM = "SYSTEM",
}