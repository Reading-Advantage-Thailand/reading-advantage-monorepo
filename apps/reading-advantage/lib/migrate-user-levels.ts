export function ensureLevelIsNumber(level: any): number {
  if (typeof level === "string") {
    const parsed = parseInt(level, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof level === "number") {
    return level;
  }
  return 0;
}

export function sanitizeUserLevel(user: any) {
  return {
    ...user,
    level: ensureLevelIsNumber(user.level),
  };
}
