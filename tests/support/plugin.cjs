'use strict';
// Loads the built runtime (manifest `runtime.nodeEntry`) and plays the Host
// for single calls: a ctx whose methods record each call and answer from a
// per-test script, plus real, empty plugin directories in a temp folder.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const templateRoot = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(templateRoot, 'manifest.json'), 'utf8'));
const runtimeEntry = path.join(templateRoot, manifest.runtime.nodeEntry);

function loadPluginModule() {
  if (!fs.existsSync(runtimeEntry)) {
    throw new Error(`${manifest.runtime.nodeEntry} is missing: run "npm run build" before "npm test"`);
  }
  const exported = require(runtimeEntry);
  return exported.default ?? exported;
}

/** The launch context a Host passes to the runtime, with temp data and cache directories. */
function makeLaunch(t, capabilities = []) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'template-plugin-test-'));
  t.after(() => fs.rmSync(scratch, { recursive: true, force: true }));
  const dirs = { root: templateRoot, data: path.join(scratch, 'data'), cache: path.join(scratch, 'cache') };
  fs.mkdirSync(dirs.data);
  fs.mkdirSync(dirs.cache);
  return {
    protocol: 2,
    plugin: { id: manifest.plugin.id, title: manifest.plugin.title, version: manifest.plugin.version },
    host: { platform: 'macos', version: 'test', devMode: true },
    dirs,
    capabilities,
    scratch,
  };
}

/** The registry the Node bridge dispatches to, set up with a fresh launch context. */
async function setupPlugin(t, capabilities) {
  const launch = makeLaunch(t, capabilities);
  const registry = await loadPluginModule().setup(launch);
  return { registry, launch };
}

/**
 * The bridge context of one call. Every ctx method records `[method, params]`
 * and answers with `answers[method]` (a value, or a function of the params);
 * unscripted methods answer `{}`.
 */
function fakeHost(launch, answers = {}) {
  const calls = [];
  const call = async (method, params) => {
    calls.push([method, params]);
    const answer = answers[method];
    return typeof answer === 'function' ? answer(params) : (answer ?? {});
  };
  const domain = name => new Proxy({}, { get: (_target, key) => params => call(`${name}.${String(key)}`, params ?? {}) });
  const ctx = {
    item: domain('item'),
    input: domain('input'),
    system: domain('system'),
    env: domain('env'),
    settings: domain('settings'),
    log: domain('log'),
    call,
    launch,
  };
  return {
    ctx,
    calls,
    methods: () => calls.map(([method]) => method),
    /** Params of every call to `method`. */
    paramsOf: method => calls.filter(([name]) => name === method).map(([, params]) => params),
  };
}

function itemSnapshot(kind, extra = {}) {
  return {
    id: 'item-1',
    kind,
    tags: [],
    pinned: false,
    sourceApp: 'com.example.editor',
    createdAt: 1,
    lastCopiedAt: 2,
    attachments: [],
    ...extra,
  };
}

const textContent = text => ({ kind: 'text', text });
const imageContent = { kind: 'image', width: 4, height: 3, format: 'png', bytes: 128 };

/** A file standing in for the Host's read-only copy of the input image. */
function writeInputImage(launch, bytes = crypto.randomBytes(128)) {
  const file = path.join(launch.scratch, 'input-image.png');
  fs.writeFileSync(file, bytes);
  return { file, bytes };
}

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

module.exports = {
  manifest,
  templateRoot,
  runtimeEntry,
  makeLaunch,
  setupPlugin,
  fakeHost,
  itemSnapshot,
  textContent,
  imageContent,
  writeInputImage,
  sha256,
};
