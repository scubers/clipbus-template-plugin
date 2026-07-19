'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const templateRoot = path.resolve(__dirname, '../..');
const installHook = path.join(templateRoot, 'scripts', 'install.mjs');

function makeFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'clipbus-install-hook-'));
  const scriptsDir = path.join(root, 'scripts');
  const fakeNpm = path.join(root, 'fake-npm.mjs');
  const logPath = path.join(root, 'npm-calls.log');

  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(path.join(root, 'node_modules'));
  fs.copyFileSync(installHook, path.join(scriptsDir, 'install.mjs'));
  fs.writeFileSync(
    fakeNpm,
    `#!/usr/bin/env node
import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
appendFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args) + '\\n');
if (process.env.FAKE_NPM_FAIL_INSTALL === '1' && args[0] === 'install') {
  process.exit(17);
}
`,
  );
  fs.chmodSync(fakeNpm, 0o755);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  return { root, fakeNpm, logPath };
}

function runInstallHook(fixture, extraEnv = {}) {
  return spawnSync(process.execPath, [path.join(fixture.root, 'scripts', 'install.mjs')], {
    cwd: fixture.root,
    encoding: 'utf8',
    env: {
      ...process.env,
      CLIPBUS_PLUGIN_NPM_PATH: fixture.fakeNpm,
      FAKE_NPM_LOG: fixture.logPath,
      FAKE_NPM_FAIL_INSTALL: '0',
      ...extraEnv,
    },
  });
}

function readCalls(logPath) {
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
}

test('install hook refreshes dependencies before building when node_modules exists', (t) => {
  const fixture = makeFixture(t);

  const result = runInstallHook(fixture);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readCalls(fixture.logPath), [['install'], ['run', 'build']]);
});

test('install hook does not build when dependency installation fails', (t) => {
  const fixture = makeFixture(t);

  const result = runInstallHook(fixture, { FAKE_NPM_FAIL_INSTALL: '1' });

  assert.notEqual(result.status, 0);
  assert.deepEqual(readCalls(fixture.logPath), [['install']]);
});
