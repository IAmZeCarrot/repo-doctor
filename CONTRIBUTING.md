# Contributing to Repo Doctor

Thanks for helping improve Repo Doctor. Bug reports, focused rule proposals, documentation fixes, and tests are welcome.

## Before opening a change

- Search existing issues and pull requests to avoid duplicate work.
- Open an issue before a broad behavioral change or a new rule with likely false positives.
- Keep scans local and deterministic. Rules must not use network access, execute scanned project code, or collect telemetry.
- Do not include real credentials in tests. Use obviously invalid examples.

Security reports should follow [SECURITY.md](SECURITY.md), not the public issue tracker.

## Development setup

Repo Doctor requires Node.js 20 or newer.

```sh
npm ci
npm run check
```

`npm run check` verifies formatting, linting, TypeScript types, tests, and the production build. Run it before opening a pull request.

## Changing rules

Each rule should remain independent and return a finding with:

- a stable, namespaced ID;
- a severity proportionate to the evidence;
- concrete evidence from the scanned working tree; and
- an actionable remediation.

Preserve existing IDs unless the underlying meaning changes incompatibly. Prefer conventional, explainable detection over guesses. Add healthy and unhealthy coverage, including a regression test for every bug fix. Document user-visible rule behavior and limitations in the README.

## Pull requests

Keep pull requests focused and explain the user impact. CI runs on supported Node.js versions. By contributing, you agree that your contribution is licensed under the MIT License.
