import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('env.ts security: DEV_AUTH_ENABLED is server-only', () => {
  const envSource = fs.readFileSync(
    path.resolve(__dirname, './env.ts'),
    'utf-8'
  );

  it('should NOT have NEXT_PUBLIC_DEV_AUTH in the env schema', () => {
    expect(envSource).not.toContain('NEXT_PUBLIC_DEV_AUTH');
  });

  it('should have DEV_AUTH_ENABLED as a server-only key', () => {
    expect(envSource).toContain('DEV_AUTH_ENABLED');
  });

  it('should not have any NEXT_PUBLIC_DEV_AUTH references anywhere in app source', () => {
    const srcDirs = ['lib', 'app', 'components'];
    const violations: string[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'generated') {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('NEXT_PUBLIC_DEV_AUTH')) {
            violations.push(fullPath);
          }
        }
      }
    }

    const projectRoot = path.resolve(__dirname, '..');
    for (const dir of srcDirs) {
      scanDir(path.join(projectRoot, dir));
    }

    expect(violations).toEqual([]);
  });
});

describe('env.ts covers .env.example surface', () => {
  const envSource = fs.readFileSync(
    path.resolve(__dirname, './env.ts'),
    'utf-8'
  );

  const envExample = fs.readFileSync(
    path.resolve(__dirname, '../.env.example'),
    'utf-8'
  );

  const envExampleVars = envExample
    .split('\n')
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => line.split('=')[0]);

  it.each(envExampleVars)('.env.example var %s should be declared in env.ts', (varName) => {
    expect(envSource).toContain(varName);
  });
});

describe('env.ts exports structured config', () => {
  it('should export aiRecommender config object', () => {
    const envSource = fs.readFileSync(
      path.resolve(__dirname, './env.ts'),
      'utf-8'
    );
    expect(envSource).toContain('aiRecommender');
    expect(envSource).toContain('aiImage');
  });
});
