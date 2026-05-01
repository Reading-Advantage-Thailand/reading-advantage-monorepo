import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('merges conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });

  it('ignores falsey values', () => {
    expect(cn('text-sm', false && 'hidden', undefined)).toBe('text-sm');
  });
});
