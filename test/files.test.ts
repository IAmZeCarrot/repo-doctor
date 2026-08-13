import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectFiles, hasAny } from '../src/files.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('file collection', () => {
  it('is deterministic and skips generated trees and symbolic links', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-doctor-'));
    temporaryDirectories.push(root);
    await fs.mkdir(path.join(root, 'src'));
    await fs.mkdir(path.join(root, 'node_modules'));
    await fs.writeFile(path.join(root, 'z.txt'), 'z');
    await fs.writeFile(path.join(root, 'src', 'a.ts'), 'a');
    await fs.writeFile(
      path.join(root, 'node_modules', 'ignored.js'),
      'ignored',
    );
    await fs.symlink(
      path.join(root, 'src'),
      path.join(root, 'linked-src'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );

    expect([...(await collectFiles(root))]).toEqual(['src/a.ts', 'z.txt']);
  });

  it('matches conventional root filenames case-insensitively', () => {
    expect(hasAny(new Set(['ReadMe.MD']), ['README.md'])).toBe(true);
  });
});
