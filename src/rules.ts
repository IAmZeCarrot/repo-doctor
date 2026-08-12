import path from 'node:path';
import { hasAny, matchingFiles } from './files.js';
import type { Finding, Rule, RuleContext, Severity } from './types.js';

function finding(
  rule: Pick<Rule, 'id' | 'title'>,
  severity: Severity,
  evidence: string[],
  remediation: string,
): Finding {
  return { id: rule.id, title: rule.title, severity, evidence, remediation };
}

const documentation: Rule = {
  id: 'documentation/readme',
  title: 'Project documentation is missing',
  async evaluate(context) {
    const candidates = ['README', 'README.md', 'README.rst', 'README.txt'];
    if (hasAny(context.files, candidates)) return undefined;
    return finding(
      this,
      'error',
      ['No README file was found at the repository root.'],
      'Add a root README describing the project, setup, usage, and maintenance expectations.',
    );
  },
};

const licensing: Rule = {
  id: 'licensing/license-file',
  title: 'License file is missing',
  async evaluate(context) {
    if (
      hasAny(context.files, ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'])
    )
      return undefined;
    return finding(
      this,
      'warning',
      ['No recognized license file was found at the repository root.'],
      'Add a license file, or document that the project is proprietary and not licensed for reuse.',
    );
  },
};

const tests: Rule = {
  id: 'tests/test-suite',
  title: 'No test suite was detected',
  async evaluate(context) {
    const testFiles = matchingFiles(context.files, (file) =>
      /(^|\/)(__tests__|tests?|spec)(\/|\.)|\.(test|spec)\.[cm]?[jt]sx?$/.test(
        file,
      ),
    );
    if (testFiles.length > 0) return undefined;
    return finding(
      this,
      'warning',
      ['No conventional test directory or test file was found.'],
      'Add automated tests for the project’s important behavior and failure modes.',
    );
  },
};

const ci: Rule = {
  id: 'ci/configuration',
  title: 'Continuous integration is not configured',
  async evaluate(context) {
    const ciFiles = matchingFiles(
      context.files,
      (file) =>
        file.startsWith('.github/workflows/') ||
        [
          '.gitlab-ci.yml',
          '.circleci/config.yml',
          'azure-pipelines.yml',
          'Jenkinsfile',
        ].includes(file),
    );
    if (ciFiles.length > 0) return undefined;
    return finding(
      this,
      'warning',
      ['No supported CI configuration was found.'],
      'Add CI that runs the project’s tests, static checks, and build on proposed changes.',
    );
  },
};

const dependencyManifest: Rule = {
  id: 'dependencies/manifest',
  title: 'No dependency manifest was detected',
  async evaluate(context) {
    const manifests = [
      'package.json',
      'pyproject.toml',
      'requirements.txt',
      'Pipfile',
      'poetry.lock',
      'go.mod',
      'Cargo.toml',
      'Gemfile',
      'composer.json',
      'pom.xml',
      'build.gradle',
      'build.gradle.kts',
    ];
    if (hasAny(context.files, manifests)) return undefined;
    return finding(
      this,
      'info',
      ['No recognized dependency manifest was found.'],
      'If the project uses external packages, commit its standard dependency manifest.',
    );
  },
};

const dependencyLock: Rule = {
  id: 'dependencies/lockfile',
  title: 'Dependency lockfile is missing',
  async evaluate(context) {
    if (!hasAny(context.files, ['package.json'])) return undefined;
    if (
      hasAny(context.files, [
        'package-lock.json',
        'npm-shrinkwrap.json',
        'yarn.lock',
        'pnpm-lock.yaml',
        'bun.lock',
        'bun.lockb',
      ])
    )
      return undefined;
    return finding(
      this,
      'warning',
      [
        'package.json exists, but no JavaScript package-manager lockfile was found.',
      ],
      'Generate and commit the lockfile for the package manager used by this project.',
    );
  },
};

const gitignore: Rule = {
  id: 'ignored-files/gitignore',
  title: 'Ignore configuration is missing',
  async evaluate(context) {
    if (context.files.has('.gitignore')) return undefined;
    return finding(
      this,
      'warning',
      ['No .gitignore file was found at the repository root.'],
      'Add a .gitignore covering generated output, local configuration, dependencies, logs, and secrets.',
    );
  },
};

const riskyFiles: Rule = {
  id: 'hygiene/risky-files',
  title: 'Potentially sensitive or generated files are present',
  async evaluate(context) {
    const risky = matchingFiles(context.files, (file) => {
      const base = path.posix.basename(file).toLowerCase();
      return (
        base === '.env' ||
        base.endsWith('.pem') ||
        base.endsWith('.key') ||
        base === 'id_rsa' ||
        base.endsWith('.p12') ||
        base.endsWith('.log') ||
        file.startsWith('node_modules/')
      );
    });
    if (risky.length === 0) return undefined;
    return finding(
      this,
      'error',
      risky.map((file) => `Potentially risky file: ${file}`),
      'Remove secrets and generated files from the repository, rotate exposed credentials, and update ignore rules.',
    );
  },
};

const staleMarkers: Rule = {
  id: 'hygiene/stale-markers',
  title: 'Unresolved maintenance markers were found',
  async evaluate(context) {
    const candidates = matchingFiles(context.files, (file) =>
      /\.(md|txt|[cm]?[jt]sx?|py|rb|go|rs|java|kt|cs|php|sh|ya?ml|toml)$/i.test(
        file,
      ),
    );
    const evidence: string[] = [];
    for (const file of candidates.slice(0, 500)) {
      const content = await context.readText(file);
      if (content === undefined || content.length > 1_000_000) continue;
      const lines = content.split(/\r?\n/u);
      lines.forEach((line, index) => {
        if (/\b(TODO|FIXME|XXX|HACK)\b/u.test(line) && evidence.length < 20)
          evidence.push(`${file}:${index + 1}: ${line.trim().slice(0, 160)}`);
      });
    }
    if (evidence.length === 0) return undefined;
    return finding(
      this,
      'info',
      evidence,
      'Review each marker, resolve obsolete work, and link intentional follow-ups to tracked issues.',
    );
  },
};

const packageMetadata: Rule = {
  id: 'hygiene/package-metadata',
  title: 'Package metadata needs attention',
  async evaluate(context) {
    if (!context.files.has('package.json')) return undefined;
    const raw = await context.readText('package.json');
    if (raw === undefined) return undefined;
    try {
      const value = JSON.parse(raw) as Record<string, unknown>;
      const missing = ['name', 'version', 'description', 'license'].filter(
        (key) => typeof value[key] !== 'string' || value[key] === '',
      );
      if (missing.length === 0) return undefined;
      return finding(
        this,
        'warning',
        [`package.json is missing usable metadata: ${missing.join(', ')}.`],
        'Fill in the missing package metadata so consumers can identify and evaluate the project.',
      );
    } catch {
      return finding(
        this,
        'error',
        ['package.json could not be parsed as JSON.'],
        'Correct the syntax in package.json.',
      );
    }
  },
};

export const rules: readonly Rule[] = [
  documentation,
  licensing,
  tests,
  ci,
  dependencyManifest,
  dependencyLock,
  gitignore,
  riskyFiles,
  staleMarkers,
  packageMetadata,
];

export async function evaluateRules(context: RuleContext): Promise<Finding[]> {
  const results = await Promise.all(
    rules.map((rule) => rule.evaluate(context)),
  );
  return results.filter((result): result is Finding => result !== undefined);
}
