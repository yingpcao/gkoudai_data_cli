'use strict';
// Programmatic API. The CLI is the primary interface; this exposes the same
// building blocks for direct embedding.
//
// NOTE: DES-CBC requires Node's OpenSSL legacy provider (Node 17+). If you hit
// `ERR_OSSL_EVP_UNSUPPORTED`, launch Node with --openssl-legacy-provider, or
// invoke the `koudai` CLI which re-execs itself with that flag automatically.

const { fetchKline, resolvePeriod, normaliseCandle } = require('./src/kline');
const { fetchQuote } = require('./src/quote');
const catalog = require('./src/catalog');
const reference = require('./src/reference');
const protocol = require('./src/protocol');
const http = require('./src/http');
const { buildSpec } = require('./src/spec');
const format = require('./src/format');

module.exports = {
  fetchKline, fetchQuote, resolvePeriod, normaliseCandle,
  resolveSymbol: catalog.resolve, searchSymbols: catalog.search, listInstruments: catalog.allInstruments,
  request: http.request, ApiError: http.ApiError,
  protocol, reference, buildSpec, format,
};
