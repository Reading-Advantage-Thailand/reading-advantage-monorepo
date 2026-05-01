import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Security headers in next.config.ts', () => {
  const configPath = path.resolve(__dirname, '../next.config.ts');
  const configSource = fs.readFileSync(configPath, 'utf-8');

  it('should configure X-Frame-Options: DENY', () => {
    expect(configSource).toContain('X-Frame-Options');
    expect(configSource).toContain('DENY');
  });

  it('should configure X-Content-Type-Options: nosniff', () => {
    expect(configSource).toContain('X-Content-Type-Options');
    expect(configSource).toContain('nosniff');
  });

  it('should configure Referrer-Policy: strict-origin-when-cross-origin', () => {
    expect(configSource).toContain('Referrer-Policy');
    expect(configSource).toContain('strict-origin-when-cross-origin');
  });

  it('should configure Strict-Transport-Security', () => {
    expect(configSource).toContain('Strict-Transport-Security');
    expect(configSource).toContain('max-age=31536000');
    expect(configSource).toContain('includeSubDomains');
  });
});
