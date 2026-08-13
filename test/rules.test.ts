import { describe, expect, it } from 'vitest';
import { rules } from '../src/rules.js';

describe('rule contracts', () => {
  it('uses unique, namespaced stable IDs', () => {
    const ids = rules.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z-]+\/[a-z-]+$/u.test(id))).toBe(true);
  });

  it('returns actionable findings from every rule that detects a problem', async () => {
    const files = new Set(['package.json', '.env', 'src/example.ts']);
    const contents: Record<string, string> = {
      'package.json': '{',
      '.env': 'EXAMPLE=not-a-secret',
      'src/example.ts': '// TODO: cover this path',
    };

    for (const rule of rules) {
      const result = await rule.evaluate({
        root: '/fixture',
        files,
        readText: (file) => Promise.resolve(contents[file]),
      });
      if (result === undefined) continue;

      expect(result.id).toBe(rule.id);
      expect(result.title).toBe(rule.title);
      expect(['error', 'warning', 'info']).toContain(result.severity);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.evidence.every((item) => item.trim().length > 0)).toBe(
        true,
      );
      expect(result.remediation.trim().length).toBeGreaterThan(0);
    }
  });
});
