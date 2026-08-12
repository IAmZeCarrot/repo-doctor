#!/usr/bin/env node
import { formatJson, formatText } from './formatters.js';
import { scanRepository } from './scanner.js';
import type { Report } from './types.js';

type Format = 'text' | 'json';
type FailOn = 'error' | 'warning' | 'never';

type CliOptions = { path: string; format: Format; failOn: FailOn };

export function parseArguments(argv: string[]): CliOptions {
  if (argv[0] !== 'scan')
    throw new Error(
      'Usage: repo-doctor scan [path] [--format text|json] [--fail-on error|warning|never]',
    );
  let repositoryPath = '.';
  let format: Format = 'text';
  let failOn: FailOn = 'error';
  let pathSeen = false;
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--format') {
      const value = argv[++index];
      if (value !== 'text' && value !== 'json')
        throw new Error('--format must be text or json');
      format = value;
    } else if (argument === '--fail-on') {
      const value = argv[++index];
      if (value !== 'error' && value !== 'warning' && value !== 'never')
        throw new Error('--fail-on must be error, warning, or never');
      failOn = value;
    } else if (argument === '--help' || argument === '-h') {
      throw new Error(
        'Usage: repo-doctor scan [path] [--format text|json] [--fail-on error|warning|never]',
      );
    } else if (argument?.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (argument !== undefined && !pathSeen) {
      repositoryPath = argument;
      pathSeen = true;
    } else {
      throw new Error(`Unexpected argument: ${argument ?? ''}`);
    }
  }
  return { path: repositoryPath, format, failOn };
}

export function exitCode(report: Report, failOn: FailOn): number {
  if (failOn === 'never') return 0;
  if (report.summary.error > 0) return 1;
  return failOn === 'warning' && report.summary.warning > 0 ? 1 : 0;
}

export async function run(
  argv: string[],
  output = console.log,
  errorOutput = console.error,
): Promise<number> {
  try {
    const options = parseArguments(argv);
    const report = await scanRepository(options.path);
    output(options.format === 'json' ? formatJson(report) : formatText(report));
    return exitCode(report, options.failOn);
  } catch (error) {
    errorOutput(
      `repo-doctor: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 2;
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  process.exitCode = await run(process.argv.slice(2));
}
