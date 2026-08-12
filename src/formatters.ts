import type { Report } from './types.js';

export function formatJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}

export function formatText(
  report: Report,
  color = process.stdout.isTTY,
): string {
  const paint = (code: number, text: string): string =>
    color ? `\u001b[${code}m${text}\u001b[0m` : text;
  const label = {
    error: (text: string) => paint(31, text),
    warning: (text: string) => paint(33, text),
    info: (text: string) => paint(36, text),
  };
  const lines = [paint(1, 'Repo Doctor'), report.repository.path, ''];
  if (report.findings.length === 0) {
    lines.push(paint(32, 'No health findings.'));
  } else {
    for (const item of report.findings) {
      lines.push(
        `${label[item.severity](`[${item.severity.toUpperCase()}]`)} ${item.id} — ${item.title}`,
      );
      for (const evidence of item.evidence)
        lines.push(`  Evidence: ${evidence}`);
      lines.push(`  Fix: ${item.remediation}`, '');
    }
  }
  lines.push(
    `Summary: ${report.summary.error} error(s), ${report.summary.warning} warning(s), ${report.summary.info} info`,
  );
  return lines.join('\n');
}
