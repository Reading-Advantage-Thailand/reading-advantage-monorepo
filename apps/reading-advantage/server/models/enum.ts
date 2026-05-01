export enum DBCollection {
  NEWARTICLES = "new-articles",
  NEWARTICLES_MC = "mc-questions",
  NEWARTICLES_SA = "sa-questions",
  NEWARTICLES_LA = "la-questions",

  USERS = "users",

  USER_ACTIVITY_LOGS = "user-activity-logs",

  LICENSES = "licenses",
  LICENSE_RECORDS = "records",
}

export enum Role {
  USER = "user",
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
  SYSTEM = "system",
}

export enum ArticleType {
  FICTION = "fiction",
  NONFICTION = "nonfiction",
}

export enum ArticleBaseCefrLevel {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
}

export enum LicenseSubScriptionLevel {
  BASIC = "basic",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum LicenseExpirationDate {
  HALFYEARS = "180",
  FULLYEARS = "360",
}
