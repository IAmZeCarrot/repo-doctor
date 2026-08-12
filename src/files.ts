import { promises as fs } from 'node:fs';
import path from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.cache',
]);

export async function collectFiles(root: string): Promise<Set<string>> {
  const files = new Set<string>();

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await walk(absolute);
      } else if (entry.isFile()) {
        files.add(relative);
      }
    }
  }

  await walk(root);
  return files;
}

export function hasAny(
  files: ReadonlySet<string>,
  candidates: string[],
): boolean {
  const lower = new Set([...files].map((file) => file.toLowerCase()));
  return candidates.some((candidate) => lower.has(candidate.toLowerCase()));
}

export function matchingFiles(
  files: ReadonlySet<string>,
  predicate: (file: string) => boolean,
): string[] {
  return [...files].filter(predicate).sort();
}
