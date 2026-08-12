import { promises as fs } from 'node:fs';
import path from 'node:path';
import { collectFiles } from './files.js';
import { evaluateRules } from './rules.js';
import type { Report, ScanOptions } from './types.js';

export async function scanRepository(
  inputPath: string,
  options: ScanOptions = {},
): Promise<Report> {
  const root = path.resolve(inputPath);
  const stats = await fs.stat(root).catch(() => undefined);
  if (!stats?.isDirectory())
    throw new Error(`Repository path is not a directory: ${inputPath}`);

  const files = await collectFiles(root);
  const findings = await evaluateRules({
    root,
    files,
    async readText(relativePath) {
      try {
        return await fs.readFile(path.join(root, relativePath), 'utf8');
      } catch {
        return undefined;
      }
    },
  });
  findings.sort(
    (left, right) =>
      severityRank(left.severity) - severityRank(right.severity) ||
      left.id.localeCompare(right.id),
  );
  const summary = {
    error: findings.filter((item) => item.severity === 'error').length,
    warning: findings.filter((item) => item.severity === 'warning').length,
    info: findings.filter((item) => item.severity === 'info').length,
    total: findings.length,
  };
  return {
    schemaVersion: '1.0.0',
    tool: { name: 'repo-doctor', version: '1.0.0' },
    repository: { path: root },
    generatedAt: (options.now ?? new Date()).toISOString(),
    summary,
    findings,
  };
}

function severityRank(severity: 'error' | 'warning' | 'info'): number {
  return { error: 0, warning: 1, info: 2 }[severity];
}
