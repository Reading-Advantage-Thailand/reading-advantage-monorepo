module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-pattern': (parsed, _when, pattern) => {
          const passed = pattern.test(parsed.header);
          return [
            passed,
            passed
              ? ''
              : 'non-chore commit subjects must end with (track_id: <name>_<YYYYMMDD>)',
          ];
        },
      },
    },
  ],
  rules: {
    'subject-pattern': [
      2,
      'always',
      /^(?:(?:chore)\([^)]+\)!?:\s.+|(?:feat|fix|docs|refactor|test|perf|build|ci|style)\([^)]+\)!?:\s.+\s\(track_id:\s[a-z_]+_2026\d{4}\))$/,
    ],
  },
};
