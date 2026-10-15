#!/usr/bin/env node
'use strict';
// Executable entry. DES-CBC needs the OpenSSL legacy provider on Node 17+,
// so re-exec ourselves with that flag when it is absent.

const LEGACY = '--openssl-legacy-provider';
if (!process.execArgv.includes(LEGACY) && !(process.env.NODE_OPTIONS || '').includes(LEGACY)) {
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, [LEGACY, __filename, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exit(r.status == null ? 1 : r.status);
}

const { run } = require('../src/cli');
const { ApiError } = require('../src/http');

run(process.argv.slice(2))
  .then(() => process.exit(0))
  .catch(err => {
    if (err && err.usage) { console.error(`koudai: ${err.message}`); process.exit(1); }
    if (err instanceof ApiError) { console.error(`koudai: API error status=${err.status} desc=${err.desc}`); process.exit(2); }
    console.error(`koudai: ${err.message}`);
    process.exit(3);
  });
