module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-pattern': [
      2,
      'always',
      /^(feat|fix|chore|docs|refactor|test|perf|build|ci|style)\([^)]+\)!?:\s.+\s\(track_id:\s[a-z_]+_2026\d{4}\)$/,
    ],
  },
};
