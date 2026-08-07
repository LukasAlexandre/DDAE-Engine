import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDistributionSmoke } from '../scripts/release/smoke-distribution.mjs';

// The full distribution smoke (npm pack + npm install + a full CLI journey
// against the installed binary) takes real seconds and a real npm install,
// so it must run exactly once per `release:check` — via the explicit
// `npm run smoke` step. Plain `npm test` / `node --test` (which this file is
// discovered by) does NOT run it by default, to avoid `release:check`
// (`npm test && npm run package:check && npm run smoke`) executing the same
// heavy install twice. Opt in locally with:
//   DDAE_RUN_SMOKE_TEST=1 npm test
// This also means no Unix-only inline env var syntax was added to any
// package.json script — the opt-in lives entirely in the developer's shell.
const RUN_HEAVY_SMOKE = process.env.DDAE_RUN_SMOKE_TEST === '1';

test(
  'runDistributionSmoke installs the real tarball and completes the full CLI journey',
  { skip: !RUN_HEAVY_SMOKE && 'set DDAE_RUN_SMOKE_TEST=1 to run the full install-based smoke test (also covered by `npm run smoke` in release:check)' },
  async () => {
    const outcome = await runDistributionSmoke();

    if (!outcome.ok) {
      assert.fail(`Distribution smoke failed: ${JSON.stringify(outcome.results, null, 2)}`);
    }

    const stepNames = outcome.results.map((result) => result.name);
    for (const expected of [
      'Tarball', 'Package install', 'Installed binary', 'Package contents',
      'Repository independence', 'CLI --version', 'CLI --help', 'Fresh init',
      'Zero sessions', 'Session 01', 'Session 02', '13 modules', 'Block flow',
      'Prompt flow', 'Feedback flow', 'Validate', 'Audit', 'Legacy detection', 'Cleanup',
    ]) {
      assert.ok(stepNames.includes(expected), `missing smoke step: ${expected}`);
    }
    assert.ok(outcome.results.every((result) => result.ok), 'every smoke step must succeed');
  },
);
