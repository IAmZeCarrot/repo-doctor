import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanRepository } from '../src/scanner.js';

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
);

describe('scanRepository', () => {
  it('returns no findings for a healthy fixture', async () => {
    const report = await scanRepository(path.join(fixtures, 'healthy'), {
      now: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(report.summary).toEqual({ error: 0, warning: 0, info: 0, total: 0 });
    expect(report.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('reports stable findings with evidence and remediation', async () => {
    const report = await scanRepository(path.join(fixtures, 'unhealthy'));
    const ids = report.findings.map((item) => item.id);
    expect(ids).toContain('documentation/readme');
    expect(ids).toContain('licensing/license-file');
    expect(ids).toContain('tests/test-suite');
    expect(ids).toContain('ci/configuration');
    expect(ids).toContain('dependencies/lockfile');
    expect(ids).toContain('ignored-files/gitignore');
    expect(ids).toContain('hygiene/risky-files');
    expect(ids).toContain('hygiene/stale-markers');
    expect(ids).toContain('hygiene/package-metadata');
    expect(
      report.findings.every(
        (item) => item.evidence.length > 0 && item.remediation.length > 0,
      ),
    ).toBe(true);
  });
});
