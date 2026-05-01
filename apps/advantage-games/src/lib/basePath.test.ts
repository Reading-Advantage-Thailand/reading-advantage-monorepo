const ORIGINAL_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH;

async function loadWithBasePath(basePath?: string) {
  if (typeof basePath === 'string') {
    process.env.NEXT_PUBLIC_BASE_PATH = basePath;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
  const basePathModule = await import('./basePath');
  return basePathModule.withBasePath;
}

afterEach(() => {
  if (typeof ORIGINAL_BASE_PATH === 'string') {
    process.env.NEXT_PUBLIC_BASE_PATH = ORIGINAL_BASE_PATH;
  } else {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  }
  jest.resetModules();
});

describe('withBasePath', () => {
  it('prefixes paths when a base path is set', async () => {
    const withBasePath = await loadWithBasePath('/base');

    expect(withBasePath('images/logo.png')).toBe('/base/images/logo.png');
    expect(withBasePath('/games/play')).toBe('/base/games/play');
  });

  it('keeps paths stable when no base path is configured', async () => {
    const withBasePath = await loadWithBasePath();

    expect(withBasePath('images/logo.png')).toBe('/images/logo.png');
    expect(withBasePath('/games/play')).toBe('/games/play');
  });
});
