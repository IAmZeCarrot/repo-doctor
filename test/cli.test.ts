import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { exitCode, parseArguments, run } from '../src/cli.js';
import type { Report } from '../src/types.js';

const unhealthy = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'unhealthy',
);

describe('CLI', () => {
  it('parses supported options', () => {
    expect(
      parseArguments([
        'scan',
        '/tmp/repo',
        '--format',
        'json',
        '--fail-on',
        'never',
      ]),
    ).toEqual({
      path: '/tmp/repo',
      format: 'json',
      failOn: 'never',
    });
  });

  it('uses meaningful threshold exit codes', () => {
    const report = {
      summary: { error: 0, warning: 1, info: 0, total: 1 },
    } as Report;
    expect(exitCode(report, 'error')).toBe(0);
    expect(exitCode(report, 'warning')).toBe(1);
    expect(exitCode(report, 'never')).toBe(0);
  });

  it('emits a machine-readable report end to end', async () => {
    const output = vi.fn();
    const errors = vi.fn();
    const code = await run(
      ['scan', unhealthy, '--format', 'json', '--fail-on', 'never'],
      output,
      errors,
    );
    expect(code).toBe(0);
    expect(errors).not.toHaveBeenCalled();
    const report = JSON.parse(String(output.mock.calls[0]?.[0])) as Report;
    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.findings.length).toBeGreaterThan(0);
  });

  it('returns 2 for invalid usage', async () => {
    const errors = vi.fn();
    expect(await run(['unknown'], vi.fn(), errors)).toBe(2);
    expect(errors).toHaveBeenCalledOnce();
  });
});
