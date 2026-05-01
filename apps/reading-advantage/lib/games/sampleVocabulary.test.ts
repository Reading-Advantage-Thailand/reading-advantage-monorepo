import { SAMPLE_VOCABULARY } from './sampleVocabulary';

describe('SAMPLE_VOCABULARY', () => {
  it('contains vocabulary items with terms and translations', () => {
    expect(SAMPLE_VOCABULARY.length).toBeGreaterThan(0);

    SAMPLE_VOCABULARY.forEach((entry) => {
      expect(entry.term.trim()).not.toBe('');
      expect(entry.translation.trim()).not.toBe('');
    });
  });
});
