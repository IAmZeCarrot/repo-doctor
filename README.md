# Repo Doctor

Repo Doctor is a small, local-first CLI that scans a repository and produces a practical health report. It checks whether common project essentials are present and points to evidence and a concrete remediation for every finding.

The scan is deterministic, performs no network requests, sends no telemetry, and does not require a GitHub account.

## Requirements

- Node.js 20 or newer

## Installation

Install from a checked-out copy:

```sh
npm install
npm run build
npm link
```

You can also run the built CLI without linking it:

```sh
node dist/cli.js scan .
```

## GitHub Action

To scan every pull request without installing the CLI locally, add this workflow to `.github/workflows/repo-doctor.yml`:

```yaml
name: Repository health

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  repo-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: IAmZeCarrot/repo-doctor@main
        with:
          fail-on: warning
```

The Action adds a readable report to the job summary and uploads the complete JSON report as the `repo-doctor-report` artifact. It performs the same local, deterministic scan as the CLI and does not need a token or make network requests while scanning.

### Action inputs

| Input           | Default              | Purpose                                                     |
| --------------- | -------------------- | ----------------------------------------------------------- |
| `path`          | `.`                  | Repository path to scan, relative to the workflow workspace |
| `fail-on`       | `error`              | Fail on `error`, `warning`, or `never`                      |
| `artifact-name` | `repo-doctor-report` | Name of the uploaded JSON artifact                          |

The Action exposes `report-path`, `errors`, `warnings`, and `findings` outputs for later steps. See [the complete example](examples/repo-doctor.yml).

## Usage

```text
repo-doctor scan [path] [--format text|json] [--fail-on error|warning|never]
```

`path` defaults to the current directory. Text is the default format. The default failure threshold is `error`.

```sh
# Scan the current directory
repo-doctor scan

# Scan another checkout and emit JSON
repo-doctor scan ../another-project --format json

# Make warnings fail a CI job
repo-doctor scan . --fail-on warning

# Report findings without a nonzero finding exit code
repo-doctor scan . --fail-on never
```

### Exit codes

| Code | Meaning                                                                         |
| ---: | ------------------------------------------------------------------------------- |
|  `0` | Scan completed and did not cross the configured failure threshold               |
|  `1` | Scan completed and crossed the configured failure threshold                     |
|  `2` | Invalid arguments, missing path, unreadable input, or another operational error |

Informational findings never fail a scan. `--fail-on error` fails only when an error exists. `--fail-on warning` fails on either warnings or errors. `--fail-on never` always returns `0` after a successful scan.

## Rules

Rules are independent and expose a stable ID, severity, title, evidence, and remediation.

| Stable ID                  | Default severity | What it checks                                                                        |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| `documentation/readme`     | error            | A root README exists                                                                  |
| `licensing/license-file`   | warning          | A conventional root license file exists                                               |
| `tests/test-suite`         | warning          | Conventional test files or directories exist                                          |
| `ci/configuration`         | warning          | A supported CI configuration exists                                                   |
| `dependencies/manifest`    | info             | A recognized dependency manifest exists                                               |
| `dependencies/lockfile`    | warning          | A JavaScript project commits a package-manager lockfile                               |
| `ignored-files/gitignore`  | warning          | A root `.gitignore` exists                                                            |
| `hygiene/risky-files`      | error            | Common secret-key, environment, certificate, or generated-log files are absent        |
| `hygiene/stale-markers`    | info             | Text source files do not contain unresolved `TODO`, `FIXME`, `XXX`, or `HACK` markers |
| `hygiene/package-metadata` | warning/error    | `package.json` parses and includes basic identifying metadata                         |

Repo Doctor skips large generated directories such as `.git`, `node_modules`, `dist`, `build`, and `coverage`. It does not follow symbolic links. Marker scanning is limited to 500 conventional text/source files and ignores files larger than 1 MB.

## JSON output

JSON reports include the schema version, tool identity, absolute repository path, generation timestamp, severity totals, and ordered findings. The schema is published at [`docs/repo-doctor-report.schema.json`](docs/repo-doctor-report.schema.json).

Example:

```json
{
  "schemaVersion": "1.0.0",
  "tool": { "name": "repo-doctor", "version": "1.0.0" },
  "repository": { "path": "/work/example" },
  "generatedAt": "2026-08-12T12:00:00.000Z",
  "summary": { "error": 1, "warning": 0, "info": 0, "total": 1 },
  "findings": [
    {
      "id": "documentation/readme",
      "severity": "error",
      "title": "Project documentation is missing",
      "evidence": ["No README file was found at the repository root."],
      "remediation": "Add a root README describing the project, setup, usage, and maintenance expectations."
    }
  ]
}
```

The report contains a timestamp, so byte-for-byte output across separate runs will differ. Findings and their order are deterministic for the same filesystem contents.

## Development

```sh
npm install
npm run check
```

The check command verifies formatting, lint rules, TypeScript types, unit and integration tests, and the production build. Test repositories live in `test/fixtures`. GitHub Actions runs the same command on pull requests and pushes to `main`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution workflow and guidance for adding or changing rules. Please report vulnerabilities according to [SECURITY.md](SECURITY.md), rather than in a public issue.

## Limitations

- Detection uses conventional filenames and lightweight content inspection. Repo Doctor does not execute project code or infer every custom layout.
- A file being present does not prove that its contents are complete or effective.
- Secret detection is filename-based, not a credential scanner. If a sensitive file is reported, investigate it and rotate any exposed credential.
- The first release scans working-tree contents. It does not inspect Git history, remote settings, branch protection, dependency vulnerabilities, package freshness, or CI results.
- Findings are guidance, not a security certification or legal opinion.

## License

MIT
